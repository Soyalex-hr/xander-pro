// GET /api/health — comprueba la conexión con Neon (no expone credenciales)
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { blobConfigured, blobOptions } from './upload.js';

// Prueba de escritura en Blob: sobrescribe siempre el mismo archivo diminuto
async function testBlob() {
  try {
    const r = await put('diagnostico/ping.txt', 'ok ' + new Date().toISOString(), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain', ...blobOptions() });
    return { ok: true, host: new URL(r.url).host };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e).slice(0, 300) };
  }
}

export default async function handler(req, res) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const vars = Object.keys(process.env).filter(k => /^(DATABASE|POSTGRES|PG|NEON|BLOB)/.test(k) || /BLOB/.test(k)).sort();
  res.setHeader('Cache-Control', 'no-store');
  if (!url) {
    return res.status(200).json({ ok: false, db: 'No hay DATABASE_URL configurada en Vercel', vars });
  }
  try {
    const sql = neon(url);
    const [info] = await sql`select version() as version, now() as now`;
    const [tbl] = await sql`select to_regclass('public.companies') as companies`;
    return res.status(200).json({
      ok: true,
      vars,
      postgres: String(info.version).split(' ').slice(0, 2).join(' '),
      serverTime: info.now,
      initialized: !!tbl.companies,
      blob: blobConfigured(),
      blobTest: (req.query && req.query.blobtest) ? await testBlob() : undefined,
      project: process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || ''
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, vars });
  }
}
