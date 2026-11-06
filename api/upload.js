// POST /api/upload  { dataUrl, name }
// Sube una imagen (ya comprimida en el navegador) a Vercel Blob y devuelve su URL pública.
// La imagen queda en empresas/<empresa>/fotos/... para mantener separadas las empresas.
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { send, fail, allow, body, handler } from './_lib/http.js';
import { requireSession } from './_lib/auth.js';

const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX_BYTES = 3 * 1024 * 1024;

// Token de Vercel Blob: normalmente BLOB_READ_WRITE_TOKEN; si el almacén se conectó
// con otro prefijo (p. ej. FOTOS_BLOB_READ_WRITE_TOKEN) también se reconoce.
export function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const k = Object.keys(process.env).find(n => /BLOB_READ_WRITE_TOKEN$/.test(n) && process.env[n]);
  return k ? process.env[k] : null;
}
// Las conexiones nuevas de Vercel Blob usan OIDC (BLOB_STORE_ID + token del despliegue)
// en lugar de BLOB_READ_WRITE_TOKEN; el SDK se autentica solo en ese caso.
export function blobConfigured() {
  return !!blobToken() || !!process.env.BLOB_STORE_ID;
}
export function blobOptions() {
  const t = blobToken();
  return t ? { token: t } : {};
}

export default handler(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  const s = await requireSession(req, res, { write: true });
  if (!s) return;
  if (!blobConfigured() && !globalThis.__XP_TEST_BLOB__) {
    return fail(res, 503, 'El almacenamiento de fotos (Vercel Blob) no está conectado al proyecto', { noBlob: true });
  }

  const { dataUrl, name } = body(req);
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return fail(res, 400, 'Formato de imagen no válido (se acepta WebP, JPEG o PNG)');
  const contentType = m[1];
  const buffer = Buffer.from(m[2], 'base64');
  if (!buffer.length) return fail(res, 400, 'La imagen está vacía');
  if (buffer.length > MAX_BYTES) return fail(res, 413, 'La imagen supera 3 MB');

  const safe = String(name || 'foto').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'foto';
  const pathname = `empresas/${s.company_id}/fotos/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}.${TYPES[contentType]}`;

  const putFn = globalThis.__XP_TEST_BLOB__ || put;
  const blob = await putFn(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    ...(globalThis.__XP_TEST_BLOB__ ? {} : blobOptions())
  });
  send(res, 200, { ok: true, url: blob.url, pathname: blob.pathname || pathname, size: buffer.length });
});
