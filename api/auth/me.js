// GET  /api/auth/me — usuario y empresa de la sesión actual
// POST /api/auth/me — cierra la sesión actual (antes /api/auth/logout; se unieron para no
//                     pasar el límite de funciones de Vercel. /api/auth/logout sigue
//                     funcionando con una redirección interna en vercel.json)
import { send, allow, handler } from '../_lib/http.js';
import { requireSession, publicUser, publicCompany, destroySession } from '../_lib/auth.js';

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST'])) return;
  if (req.method === 'POST') {
    await destroySession(req, res);
    return send(res, 200, { ok: true });
  }
  const s = await requireSession(req, res);
  if (!s) return;
  send(res, 200, { ok: true, user: publicUser(s), company: publicCompany(s) });
});
