// POST /api/auth/login  { username, password, remember }
import { db } from '../_lib/db.js';
import { send, fail, allow, body, handler } from '../_lib/http.js';
import { verifyPassword, createSession, normalizeUsername, publicUser } from '../_lib/auth.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export default handler(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  const b = body(req);
  const username = normalizeUsername(b.username);
  const password = typeof b.password === 'string' ? b.password : '';
  if (!username || !password) return fail(res, 400, 'Ingresa usuario y contraseña');

  const [tbl] = await db().q(`SELECT to_regclass('public.companies') AS t`);
  const [count] = tbl.t ? await db().q(`SELECT count(*)::int AS n FROM companies`) : [{ n: 0 }];
  if (!count.n) return fail(res, 409, 'El sistema aún no está configurado', { needsSetup: true });

  const rows = await db().q(
    `SELECT u.*, c.name AS company_name, c.nit AS company_nit, c.active AS company_active
       FROM users u JOIN companies c ON c.id = u.company_id
      WHERE lower(u.username) = $1`,
    [username]
  );
  const u = rows[0];

  if (u && u.locked_until && new Date(u.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(u.locked_until) - new Date()) / 60000);
    return fail(res, 429, `Usuario bloqueado por intentos fallidos. Intenta de nuevo en ${mins} minuto(s).`);
  }

  if (!u || !u.active || !u.company_active || !verifyPassword(password, u.password_hash)) {
    if (u) {
      await db().q(
        `UPDATE users SET failed_attempts = failed_attempts + 1,
                locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN now() + make_interval(mins => $3) ELSE locked_until END
          WHERE id = $1`,
        [u.id, MAX_ATTEMPTS, LOCK_MINUTES]
      );
    }
    return fail(res, 401, 'Usuario o contraseña incorrectos');
  }

  await db().q(`UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`, [u.id]);
  await createSession(req, res, u, !!b.remember);
  send(res, 200, {
    ok: true,
    user: publicUser(u),
    company: { id: u.company_id, name: u.company_name, nit: u.company_nit || '' }
  });
});
