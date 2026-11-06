// Usuarios de la empresa (solo administradores).
// GET   /api/users                      -> lista
// POST  /api/users  {name, username, role, password}
// PATCH /api/users  {id, name?, role?, active?, password?}
import { db } from './_lib/db.js';
import { send, fail, allow, body, text, handler } from './_lib/http.js';
import { requireSession, hashPassword, passwordProblem, normalizeUsername, validUsername, ROLES } from './_lib/auth.js';

const view = u => ({
  id: u.id, username: u.username, name: u.name, role: u.role, active: u.active,
  isSuperadmin: u.is_superadmin, lastLoginAt: u.last_login_at, createdAt: u.created_at
});

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST', 'PATCH'])) return;
  const s = await requireSession(req, res, { admin: true });
  if (!s) return;

  if (req.method === 'GET') {
    const rows = await db().q(
      `SELECT id, username, name, role, active, is_superadmin, last_login_at, created_at
         FROM users WHERE company_id = $1 ORDER BY created_at`,
      [s.company_id]
    );
    return send(res, 200, { ok: true, users: rows.map(view) });
  }

  const b = body(req);

  if (req.method === 'POST') {
    const name = text(b.name, 120);
    const username = normalizeUsername(b.username);
    const role = ROLES.includes(b.role) ? b.role : 'Comercial';
    if (!name) return fail(res, 400, 'Escribe el nombre');
    if (!validUsername(username)) return fail(res, 400, 'Usuario inválido: 3 a 40 caracteres (letras, números, punto, guion)');
    const pp = passwordProblem(b.password);
    if (pp) return fail(res, 400, pp);
    const exists = await db().q(`SELECT 1 FROM users WHERE lower(username) = $1`, [username]);
    if (exists.length) return fail(res, 409, 'Ese nombre de usuario ya existe');
    const [u] = await db().q(
      `INSERT INTO users (company_id, username, name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, role, active, is_superadmin, last_login_at, created_at`,
      [s.company_id, username, name, role, hashPassword(b.password)]
    );
    return send(res, 200, { ok: true, user: view(u) });
  }

  // PATCH
  const id = typeof b.id === 'string' ? b.id : '';
  const [target] = await db().q(`SELECT * FROM users WHERE id::text = $1 AND company_id = $2`, [id, s.company_id]);
  if (!target) return fail(res, 404, 'Usuario no encontrado');

  const name = b.name !== undefined ? text(b.name, 120) : target.name;
  const role = b.role !== undefined ? (ROLES.includes(b.role) ? b.role : null) : target.role;
  const active = b.active !== undefined ? !!b.active : target.active;
  if (!name) return fail(res, 400, 'Escribe el nombre');
  if (!role) return fail(res, 400, 'Rol inválido');

  // No dejar la empresa sin administradores activos
  const losesAdmin = target.role === 'Administrador' && target.active && (role !== 'Administrador' || !active);
  if (losesAdmin) {
    const [{ n }] = await db().q(
      `SELECT count(*)::int AS n FROM users WHERE company_id = $1 AND role = 'Administrador' AND active AND id <> $2`,
      [s.company_id, target.id]
    );
    if (!n) return fail(res, 400, 'La empresa debe tener al menos un administrador activo');
  }

  let passwordHash = target.password_hash;
  if (b.password) {
    const pp = passwordProblem(b.password);
    if (pp) return fail(res, 400, pp);
    passwordHash = hashPassword(b.password);
  }

  const [u] = await db().q(
    `UPDATE users SET name = $2, role = $3, active = $4, password_hash = $5,
            failed_attempts = CASE WHEN $6 THEN 0 ELSE failed_attempts END,
            locked_until = CASE WHEN $6 THEN NULL ELSE locked_until END
      WHERE id = $1
      RETURNING id, username, name, role, active, is_superadmin, last_login_at, created_at`,
    [target.id, name, role, active, passwordHash, !!b.password]
  );
  // Si se desactiva o cambia la contraseña, se cierran sus sesiones
  if (!active || b.password) await db().q(`DELETE FROM sessions WHERE user_id = $1 AND user_id <> $2`, [target.id, s.id]);
  send(res, 200, { ok: true, user: view(u) });
});
