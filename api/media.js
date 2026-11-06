// GET /api/media?url=<url pública de Vercel Blob>
// Entrega la imagen desde el mismo dominio de la app. Se usa al generar el PDF:
// la librería que convierte la página en imagen solo puede leer imágenes del mismo
// origen (o con CORS). Solo acepta URLs de Vercel Blob y requiere sesión.
import { fail, allow, handler } from './_lib/http.js';
import { requireSession } from './_lib/auth.js';

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET'])) return;
  const s = await requireSession(req, res);
  if (!s) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  let target;
  try { target = new URL(String(q.url || '')); } catch { return fail(res, 400, 'URL inválida'); }
  const allowed = target.protocol === 'https:' && (target.hostname.endsWith('.public.blob.vercel-storage.com') || (globalThis.__XP_TEST_MEDIA_HOST__ && target.hostname === globalThis.__XP_TEST_MEDIA_HOST__));
  if (!allowed) return fail(res, 400, 'Solo se permiten imágenes del almacenamiento de la app');
  // Cada empresa solo puede leer sus propias fotos
  if (!target.pathname.startsWith(`/empresas/${s.company_id}/`)) return fail(res, 403, 'Imagen de otra empresa');

  const r = await fetch(target.href);
  if (!r.ok) return fail(res, 404, 'Imagen no encontrada');
  const type = r.headers.get('content-type') || 'application/octet-stream';
  if (!type.startsWith('image/')) return fail(res, 400, 'El archivo no es una imagen');
  const buf = Buffer.from(await r.arrayBuffer());
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.end(buf);
});
