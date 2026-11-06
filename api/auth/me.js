// GET /api/auth/me — usuario y empresa de la sesión actual
import { send, allow, handler } from '../_lib/http.js';
import { requireSession, publicUser, publicCompany } from '../_lib/auth.js';

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET'])) return;
  const s = await requireSession(req, res);
  if (!s) return;
  send(res, 200, { ok: true, user: publicUser(s), company: publicCompany(s) });
});
