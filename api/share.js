// Link para que el cliente vea y acepte una cotización.
//
// Con sesión (la app):
//   POST /api/share            { kind, quoteId, number, clientName, total, html, css, meta }
//        Crea o actualiza el link de esa cotización (el link se conserva al volver a compartir).
//        Respuesta: { token, path }
//   GET  /api/share?list=1      Estado de todos los links de la empresa (vistas y aceptaciones).
//   POST /api/share?t=<token>&action=revoke   Desactiva un link.
//
// Público (el cliente, sin sesión):
//   GET  /api/share?t=<token>   Devuelve la cotización guardada y cuenta la visita.
//   POST /api/share?t=<token>&action=accept   { name, note }  El cliente acepta.
//
// El documento se guarda tal como se vio en la app (copia fija). La página pública lo
// muestra dentro de un marco sin scripts, así que nada de lo guardado puede ejecutarse.
import crypto from 'node:crypto';
import { db } from './_lib/db.js';
import { send, fail, allow, body, text, handler } from './_lib/http.js';
import { requireSession } from './_lib/auth.js';

const KINDS = ['evento', 'cabana', 'diasol', 'combinada'];
const MAX_HTML = 900 * 1024;
const MAX_CSS = 600 * 1024;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await db().q(`CREATE TABLE IF NOT EXISTS quote_shares (
    token        text PRIMARY KEY,
    company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    kind         text NOT NULL,
    quote_id     text NOT NULL,
    number       text,
    client_name  text,
    total        numeric,
    html         text NOT NULL,
    css          text,
    meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    created_by   uuid,
    revoked      boolean NOT NULL DEFAULT false,
    view_count   integer NOT NULL DEFAULT 0,
    viewed_at    timestamptz,
    accepted_at  timestamptz,
    accepted_name text,
    accepted_note text
  )`);
  await db().q(`CREATE UNIQUE INDEX IF NOT EXISTS quote_shares_quote_uq ON quote_shares (company_id, kind, quote_id)`);
  tableReady = true;
}

// Defensa adicional: sin scripts, manejadores de eventos ni enlaces javascript:
function cleanHtml(h) {
  return String(h || '')
    .replace(/<\s*(script|iframe|object|embed|form|base|meta|link)\b[\s\S]*?(<\s*\/\s*\1\s*>|\/?>)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
function cleanCss(c) {
  return String(c || '').replace(/<\s*\/\s*style/gi, '').replace(/@import[^;]*;/gi, '').replace(/expression\s*\(/gi, '');
}

function q(req) { return req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams); }

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST'])) return;
  const query = q(req);
  const token = query.t ? String(query.t) : '';
  await ensureTable();

  // ---------------- Público ----------------
  if (token) {
    if (!TOKEN_RE.test(token)) return fail(res, 404, 'Este link no existe');
    const [row] = await db().q(
      `SELECT s.*, c.name AS company_name FROM quote_shares s JOIN companies c ON c.id = s.company_id WHERE s.token = $1`, [token]);
    if (!row || row.revoked) return fail(res, 404, 'Este link ya no está disponible. Pide uno nuevo a quien te envió la cotización.');

    if (req.method === 'GET') {
      if (query.nv !== '1') await db().q(`UPDATE quote_shares SET view_count = view_count + 1, viewed_at = now() WHERE token = $1`, [token]);
      return send(res, 200, {
        ok: true,
        kind: row.kind, number: row.number, clientName: row.client_name, total: Number(row.total) || 0,
        html: row.html, css: row.css || '', meta: row.meta || {}, companyName: row.company_name,
        acceptedAt: row.accepted_at, acceptedName: row.accepted_name || ''
      });
    }

    const action = String(query.action || '');
    if (action === 'accept') {
      if (row.accepted_at) return send(res, 200, { ok: true, acceptedAt: row.accepted_at, already: true });
      const validUntil = row.meta && row.meta.validUntil ? new Date(row.meta.validUntil + 'T23:59:59-05:00') : null;
      if (validUntil && !isNaN(validUntil) && validUntil < new Date()) return fail(res, 410, 'La cotización ya venció. Escríbenos para actualizarla.');
      const b = body(req);
      const name = text(b.name, 120);
      if (!name) return fail(res, 400, 'Escribe tu nombre para aceptar');
      const [up] = await db().q(
        `UPDATE quote_shares SET accepted_at = now(), accepted_name = $2, accepted_note = $3 WHERE token = $1 AND accepted_at IS NULL RETURNING accepted_at`,
        [token, name, text(b.note, 600) || null]);
      return send(res, 200, { ok: true, acceptedAt: up ? up.accepted_at : row.accepted_at });
    }
    if (action === 'revoke') {
      const s = await requireSession(req, res, { write: true });
      if (!s) return;
      if (String(row.company_id) !== String(s.company_id)) return fail(res, 404, 'Este link no existe');
      await db().q(`UPDATE quote_shares SET revoked = true, updated_at = now() WHERE token = $1`, [token]);
      return send(res, 200, { ok: true });
    }
    return fail(res, 400, 'Acción no válida');
  }

  // ---------------- Con sesión ----------------
  if (req.method === 'GET') {
    const s = await requireSession(req, res);
    if (!s) return;
    const rows = await db().q(
      `SELECT token, kind, quote_id, number, client_name, total, created_at, updated_at, revoked, view_count, viewed_at, accepted_at, accepted_name, accepted_note
         FROM quote_shares WHERE company_id = $1 ORDER BY updated_at DESC LIMIT 2000`, [s.company_id]);
    return send(res, 200, {
      ok: true,
      shares: rows.map(r => ({
        token: r.token, kind: r.kind, quoteId: r.quote_id, number: r.number, clientName: r.client_name, total: Number(r.total) || 0,
        createdAt: r.created_at, updatedAt: r.updated_at, revoked: r.revoked, viewCount: r.view_count, viewedAt: r.viewed_at,
        acceptedAt: r.accepted_at, acceptedName: r.accepted_name || '', acceptedNote: r.accepted_note || ''
      }))
    });
  }

  const s = await requireSession(req, res, { write: true });
  if (!s) return;
  const b = body(req);
  const kind = String(b.kind || '');
  const quoteId = text(b.quoteId, 120);
  if (!KINDS.includes(kind) || !quoteId) return fail(res, 400, 'Cotización no válida');
  const html = cleanHtml(b.html);
  const css = cleanCss(b.css);
  if (!html) return fail(res, 400, 'La cotización está vacía');
  if (html.length > MAX_HTML) return fail(res, 413, 'La cotización es demasiado grande para compartir (revisa fotos muy pesadas)');
  if (css.length > MAX_CSS) return fail(res, 413, 'Estilos demasiado grandes');
  const meta = b.meta && typeof b.meta === 'object' ? b.meta : {};
  const cleanMeta = {
    validUntil: /^\d{4}-\d{2}-\d{2}$/.test(String(meta.validUntil || '')) ? meta.validUntil : null,
    deposit: Number(meta.deposit) || 0,
    depositPct: Number(meta.depositPct) || 0,
    phone: text(meta.phone, 40),
    email: text(meta.email, 120),
    title: text(meta.title, 160),
    sheetWidth: Math.min(1400, Math.max(320, Number(meta.sheetWidth) || 860))
  };
  const newToken = crypto.randomBytes(18).toString('base64url');
  const [row] = await db().q(
    `INSERT INTO quote_shares (token, company_id, kind, quote_id, number, client_name, total, html, css, meta, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
     ON CONFLICT (company_id, kind, quote_id) DO UPDATE
       SET number = EXCLUDED.number, client_name = EXCLUDED.client_name, total = EXCLUDED.total,
           html = EXCLUDED.html, css = EXCLUDED.css, meta = EXCLUDED.meta, updated_at = now(), revoked = false
     RETURNING token, accepted_at`,
    [newToken, s.company_id, kind, quoteId, text(b.number, 60), text(b.clientName, 160), Number(b.total) || 0, html, css, JSON.stringify(cleanMeta), s.id]);
  send(res, 200, { ok: true, token: row.token, path: '/c/' + row.token, acceptedAt: row.accepted_at });
});
