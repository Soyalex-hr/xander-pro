// Sincronización de datos por empresa.
//
// GET  /api/sync?ts=<cursor>&col=<collection>&id=<id>[&back=<segundos>]
//   Devuelve registros modificados después del cursor (ts, col, id), en páginas
//   de hasta ~3 MB (límite de respuesta de Vercel: 4.5 MB). Sin ts = todo.
//   "ts" es el texto exacto de Postgres (microsegundos) que devuelve "next".
//   "back" retrocede N segundos para cubrir escrituras concurrentes (idempotente).
//   Respuesta: { records:[{collection,id,data,deleted,version,updatedAt}], next, more, serverTime }
//
// POST /api/sync  { changes:[{collection,id,data,deleted}] }
//   Guarda cambios (última escritura gana) y deja historial.
import { db } from './_lib/db.js';
import { send, fail, allow, body, handler } from './_lib/http.js';
import { requireSession } from './_lib/auth.js';

const PAGE_ROWS = 200;
const PAGE_BYTES = 3 * 1024 * 1024;
const MAX_CHANGES = 500;
const COLLECTION_RE = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/;

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    const s = await requireSession(req, res);
    if (!s) return;
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const ts = q.ts ? String(q.ts).slice(0, 64) : null;
    if (ts && !/^\d{4}-\d{2}-\d{2}[ T][0-9:.]+(Z|[+-]\d{2}(:?\d{2})?)?$/.test(ts)) return fail(res, 400, 'Cursor inválido');
    const back = Math.min(Math.max(Number(q.back) || 0, 0), 3600);

    const rows = ts
      ? await db().q(
          `SELECT collection, id, data, deleted, version, updated_at, updated_at::text AS cursor
             FROM records
            WHERE company_id = $1
              AND (updated_at, collection, id) > ($2::timestamptz - make_interval(secs => $5), $3, $4)
            ORDER BY updated_at, collection, id
            LIMIT ${PAGE_ROWS}`,
          [s.company_id, ts, back ? '' : String(q.col || ''), back ? '' : String(q.id || ''), back]
        )
      : await db().q(
          `SELECT collection, id, data, deleted, version, updated_at, updated_at::text AS cursor
             FROM records
            WHERE company_id = $1 AND NOT deleted
            ORDER BY updated_at, collection, id
            LIMIT ${PAGE_ROWS}`,
          [s.company_id]
        );

    const records = [];
    let bytes = 0;
    for (const r of rows) {
      const size = JSON.stringify(r.data).length;
      if (records.length && bytes + size > PAGE_BYTES) break;
      bytes += size;
      records.push({
        cursor: r.cursor,
        collection: r.collection,
        id: r.id,
        data: r.deleted ? null : r.data,
        deleted: r.deleted,
        version: r.version,
        updatedAt: new Date(r.updated_at).toISOString()
      });
    }
    const lastRec = records[records.length - 1];
    const last = lastRec ? { cursor: lastRec.cursor, collection: lastRec.collection, id: lastRec.id } : null;
    records.forEach(r => delete r.cursor);
    const [{ now, nowtext }] = await db().q(`SELECT now() AS now, now()::text AS nowtext`);
    return send(res, 200, {
      ok: true,
      records,
      more: records.length < rows.length || rows.length === PAGE_ROWS,
      next: last ? { ts: last.cursor, col: last.collection, id: last.id } : null,
      serverTime: new Date(now).toISOString(),
      serverCursor: nowtext,
      // Primera página de una sincronización completa: permite saber si la empresa está vacía
      ...(ts ? {} : { total: (await db().q(`SELECT count(*)::int AS n FROM records WHERE company_id = $1 AND NOT deleted`, [s.company_id]))[0].n })
    });
  }

  // POST: guardar cambios
  const s = await requireSession(req, res, { write: true });
  if (!s) return;
  const changes = Array.isArray(body(req).changes) ? body(req).changes : null;
  if (!changes) return fail(res, 400, 'Formato inválido: se esperaba { changes: [...] }');
  if (changes.length > MAX_CHANGES) return fail(res, 413, `Máximo ${MAX_CHANGES} cambios por envío`);

  const clean = [];
  for (const c of changes) {
    if (!c || !COLLECTION_RE.test(String(c.collection)) || typeof c.id !== 'string' || !c.id || c.id.length > 120) {
      return fail(res, 400, 'Cambio inválido (colección o id)');
    }
    const deleted = !!c.deleted;
    if (!deleted && (c.data === undefined || c.data === null || typeof c.data !== 'object')) {
      return fail(res, 400, `El registro ${c.collection}/${c.id} no tiene datos`);
    }
    clean.push({ collection: c.collection, id: c.id, data: deleted ? {} : c.data, deleted });
  }
  // Si el mismo registro viene repetido en el envío, se conserva el último
  const unique = [...new Map(clean.map(c => [c.collection + '\u0000' + c.id, c])).values()];
  clean.length = 0; clean.push(...unique);
  if (!clean.length) return send(res, 200, { ok: true, saved: [] });

  const saved = await db().q(
    `WITH input AS (
       SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(collection text, id text, data jsonb, deleted boolean)
     ),
     up AS (
       INSERT INTO records AS r (company_id, collection, id, data, deleted, updated_at, updated_by)
       SELECT $1, collection, id, data, deleted, now(), $3 FROM input
       ON CONFLICT (company_id, collection, id) DO UPDATE
         SET data = CASE WHEN EXCLUDED.deleted THEN r.data ELSE EXCLUDED.data END,
             deleted = EXCLUDED.deleted,
             version = r.version + 1,
             updated_at = now(),
             updated_by = EXCLUDED.updated_by
       RETURNING r.collection, r.id, r.data, r.deleted, r.version, r.updated_at
     ),
     hist AS (
       INSERT INTO record_history (company_id, collection, id, data, deleted, changed_by)
       SELECT $1, collection, id, CASE WHEN deleted THEN NULL ELSE data END, deleted, $3 FROM up
     )
     SELECT collection, id, version, updated_at FROM up`,
    [s.company_id, JSON.stringify(clean), s.id]
  );
  send(res, 200, {
    ok: true,
    saved: saved.map(r => ({ collection: r.collection, id: r.id, version: r.version, updatedAt: new Date(r.updated_at).toISOString() }))
  });
});
