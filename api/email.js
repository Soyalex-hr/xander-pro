// Correo de la empresa (SMTP) y envío de cotizaciones.
//
// GET  /api/email                      -> configuración SMTP (sin la contraseña)
// POST /api/email {action:'save', ...} -> guarda la configuración (solo Administrador)
// POST /api/email {action:'test', to}  -> envía un correo de prueba (solo Administrador)
// POST /api/email {action:'send', to, cc, subject, text, html, attachments:[{filename, contentType, base64}]}
//
// La contraseña SMTP se guarda cifrada (AES-256-GCM) y nunca se devuelve al navegador.
import crypto from 'node:crypto';
import { db } from './_lib/db.js';
import { send, fail, allow, body, text, handler } from './_lib/http.js';
import { requireSession } from './_lib/auth.js';
import { sendMail, validEmail, SmtpError } from './_lib/smtp.js';

const MAX_ATTACH_BYTES = 3 * 1024 * 1024;
const MAX_RECIPIENTS = 10;
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await db().q(`CREATE TABLE IF NOT EXISTS company_mail (
    company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    settings   jsonb NOT NULL DEFAULT '{}'::jsonb,
    secret     text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
  )`);
  tableReady = true;
}

function key() {
  const base = process.env.XP_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || 'xander-pro-local';
  return crypto.createHash('sha256').update('xp-smtp|' + base).digest();
}
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}
function decrypt(blob) {
  if (!blob) return '';
  const [v, iv, tag, data] = String(blob).split(':');
  if (v !== 'v1') return '';
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}

async function load(companyId) {
  await ensureTable();
  const [row] = await db().q(`SELECT settings, secret, updated_at FROM company_mail WHERE company_id = $1`, [companyId]);
  return row || null;
}

function publicSettings(row) {
  const s = (row && row.settings) || {};
  return {
    configured: !!(s.host && s.fromEmail && (s.user ? row.secret : true)),
    host: s.host || '', port: s.port || 587, secure: !!s.secure,
    user: s.user || '', fromName: s.fromName || '', fromEmail: s.fromEmail || '', replyTo: s.replyTo || '',
    bccSelf: !!s.bccSelf, hasPassword: !!(row && row.secret), updatedAt: row ? row.updated_at : null
  };
}

function emails(v) {
  const list = (Array.isArray(v) ? v : String(v || '').split(/[,;\s]+/)).map(e => String(e).trim()).filter(Boolean);
  return [...new Set(list.map(e => e.toLowerCase()))];
}

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    const s = await requireSession(req, res);
    if (!s) return;
    return send(res, 200, { ok: true, smtp: publicSettings(await load(s.company_id)) });
  }

  const b = body(req);
  const action = b.action;

  if (action === 'save') {
    const s = await requireSession(req, res, { admin: true });
    if (!s) return;
    const host = text(b.host, 120).toLowerCase();
    const port = Math.round(Number(b.port) || 0);
    const fromEmail = text(b.fromEmail, 160).toLowerCase();
    const user = text(b.user, 160);
    const replyTo = text(b.replyTo, 160).toLowerCase();
    if (!host || !/^[a-z0-9.-]+$/.test(host)) return fail(res, 400, 'Escribe un servidor SMTP válido (por ejemplo smtp.gmail.com)');
    if (!port || port < 1 || port > 65535) return fail(res, 400, 'Escribe un puerto válido (465 o 587)');
    if (!validEmail(fromEmail)) return fail(res, 400, 'Escribe el correo remitente');
    if (replyTo && !validEmail(replyTo)) return fail(res, 400, 'El correo de respuesta no es válido');
    const settings = { host, port, secure: !!b.secure || port === 465, user, fromName: text(b.fromName, 120), fromEmail, replyTo, bccSelf: !!b.bccSelf };
    const prev = await load(s.company_id);
    let secret = prev ? prev.secret : null;
    if (typeof b.password === 'string' && b.password.length) secret = encrypt(b.password.slice(0, 300));
    if (b.clearPassword) secret = null;
    await db().q(
      `INSERT INTO company_mail (company_id, settings, secret, updated_at, updated_by)
       VALUES ($1, $2::jsonb, $3, now(), $4)
       ON CONFLICT (company_id) DO UPDATE SET settings = EXCLUDED.settings, secret = EXCLUDED.secret, updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [s.company_id, JSON.stringify(settings), secret, s.id]
    );
    return send(res, 200, { ok: true, smtp: publicSettings(await load(s.company_id)) });
  }

  if (action === 'test' || action === 'send') {
    const s = await requireSession(req, res, action === 'test' ? { admin: true } : { write: true });
    if (!s) return;
    const row = await load(s.company_id);
    const pub = publicSettings(row);
    if (!pub.configured) return fail(res, 400, 'Primero configura el correo de la empresa en Mi Empresa → Correo para enviar cotizaciones', { notConfigured: true });
    const st = row.settings;
    let pass = '';
    try { pass = decrypt(row.secret); } catch { return fail(res, 400, 'La contraseña SMTP guardada no se puede leer. Escríbela de nuevo en Mi Empresa.'); }
    const cfg = { ...st, pass };

    let msg;
    if (action === 'test') {
      const to = emails(b.to || st.fromEmail);
      if (!to.length || !to.every(validEmail)) return fail(res, 400, 'Escribe un correo válido para la prueba');
      msg = {
        to, subject: 'Prueba de correo · Xander Pro',
        text: `¡Funciona! Este es un correo de prueba enviado desde Xander Pro con la configuración SMTP de ${s.company_name}.\n\nYa puedes enviar cotizaciones por correo a tus clientes.`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#10283A"><p><strong>¡Funciona!</strong></p><p>Este es un correo de prueba enviado desde Xander Pro con la configuración SMTP de <strong>${String(s.company_name).replace(/</g, '&lt;')}</strong>.</p><p>Ya puedes enviar cotizaciones por correo a tus clientes.</p></div>`
      };
    } else {
      const to = emails(b.to);
      const cc = emails(b.cc).filter(e => !to.includes(e));
      if (st.bccSelf && st.fromEmail && !to.includes(st.fromEmail) && !cc.includes(st.fromEmail)) cc.push(st.fromEmail);
      if (!to.length) return fail(res, 400, 'Escribe el correo del cliente');
      const bad = [...to, ...cc].find(e => !validEmail(e));
      if (bad) return fail(res, 400, `Correo no válido: ${bad}`);
      if (to.length + cc.length > MAX_RECIPIENTS) return fail(res, 400, `Máximo ${MAX_RECIPIENTS} destinatarios por envío`);
      const subject = text(b.subject, 200);
      if (!subject) return fail(res, 400, 'Escribe el asunto del correo');
      const attachments = [];
      let total = 0;
      for (const a of (Array.isArray(b.attachments) ? b.attachments : []).slice(0, 3)) {
        const data = String(a.base64 || '').replace(/^data:[^,]*,/, '');
        if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) return fail(res, 400, 'Adjunto inválido');
        total += Math.floor(data.length * 3 / 4);
        attachments.push({ filename: text(a.filename, 120) || 'cotizacion.pdf', contentType: a.contentType === 'application/pdf' ? 'application/pdf' : 'application/octet-stream', base64: data });
      }
      if (total > MAX_ATTACH_BYTES) return fail(res, 413, 'El PDF es demasiado grande para enviarlo por correo');
      msg = { to, cc, subject, text: typeof b.text === 'string' ? b.text.slice(0, 20000) : '', html: typeof b.html === 'string' ? b.html.slice(0, 200000) : '', attachments };
    }

    try {
      const send_ = globalThis.__XP_TEST_SENDMAIL__ || sendMail;
      await send_(cfg, msg);
    } catch (e) {
      if (e instanceof SmtpError || e.userMessage) return fail(res, 502, e.userMessage || e.message);
      throw e;
    }
    return send(res, 200, { ok: true, sentTo: msg.to, cc: msg.cc || [], at: new Date().toISOString() });
  }

  return fail(res, 400, 'Acción no válida');
});
