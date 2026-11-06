// Empresas (solo el administrador principal).
// GET  /api/companies  -> lista con número de usuarios y registros
// POST /api/companies  {name, nit, adminName, adminUsername, adminPassword}
//   Crea una empresa nueva, vacía, con su propio administrador.
import { db } from './_lib/db.js';
import { send, fail, allow, body, text, handler } from './_lib/http.js';
import { requireSession, hashPassword, passwordProblem, normalizeUsername, validUsername } from './_lib/auth.js';

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST'])) return;
  const s = await requireSession(req, res, { superadmin: true });
  if (!s) return;

  if (req.method === 'GET') {
    const rows = await db().q(
      `SELECT c.id, c.name, c.nit, c.active, c.created_at,
              (SELECT count(*)::int FROM users u WHERE u.company_id = c.id) AS users,
              (SELECT count(*)::int FROM records r WHERE r.company_id = c.id AND NOT r.deleted) AS records
         FROM companies c ORDER BY c.created_at`
    );
    return send(res, 200, { ok: true, companies: rows, currentCompanyId: s.company_id });
  }

  const b = body(req);
  const name = text(b.name, 120);
  const nit = text(b.nit, 40);
  const adminName = text(b.adminName, 120);
  const adminUsername = normalizeUsername(b.adminUsername);
  if (!name) return fail(res, 400, 'Escribe el nombre de la empresa');
  if (!adminName) return fail(res, 400, 'Escribe el nombre del administrador');
  if (!validUsername(adminUsername)) return fail(res, 400, 'Usuario inválido: 3 a 40 caracteres (letras, números, punto, guion)');
  const pp = passwordProblem(b.adminPassword);
  if (pp) return fail(res, 400, pp);
  const exists = await db().q(`SELECT 1 FROM users WHERE lower(username) = $1`, [adminUsername]);
  if (exists.length) return fail(res, 409, 'Ese nombre de usuario ya existe');

  const [c] = await db().q(`INSERT INTO companies (name, nit) VALUES ($1, $2) RETURNING id, name, nit, active, created_at`, [name, nit || null]);
  await db().q(
    `INSERT INTO users (company_id, username, name, role, password_hash) VALUES ($1, $2, $3, 'Administrador', $4)`,
    [c.id, adminUsername, adminName, hashPassword(b.adminPassword)]
  );
  send(res, 200, { ok: true, company: { ...c, users: 1, records: 0 } });
});
