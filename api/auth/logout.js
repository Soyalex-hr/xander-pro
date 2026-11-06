// POST /api/auth/logout — cierra la sesión actual
import { send, allow, handler } from '../_lib/http.js';
import { destroySession } from '../_lib/auth.js';

export default handler(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  await destroySession(req, res);
  send(res, 200, { ok: true });
});
