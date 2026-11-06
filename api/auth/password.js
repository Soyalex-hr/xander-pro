// POST /api/auth/password  { current, next } — cambia la contraseña propia
// y cierra las demás sesiones del usuario.
import { db } from '../_lib/db.js';
import { send, fail, allow, body, handler } from '../_lib/http.js';
import { requireSession, verifyPassword, hashPassword, passwordProblem } from '../_lib/auth.js';

export default handler(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  const s = await requireSession(req, res);
  if (!s) return;
  const b = body(req);
  const [u] = await db().q(`SELECT password_hash FROM users WHERE id = $1`, [s.id]);
  if (!u || !verifyPassword(String(b.current || ''), u.password_hash)) return fail(res, 400, 'La contraseña actual no es correcta');
  const pp = passwordProblem(b.next);
  if (pp) return fail(res, 400, pp);
  await db().q(`UPDATE users SET password_hash = $2 WHERE id = $1`, [s.id, hashPassword(b.next)]);
  await db().q(`DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`, [s.id, s.token_hash]);
  send(res, 200, { ok: true });
});
