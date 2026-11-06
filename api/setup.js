// POST /api/setup — Configuración inicial (solo funciona una vez, con la base vacía).
// Crea las tablas, la primera empresa y su administrador principal.
// GET /api/setup — indica si el sistema ya fue configurado.
import { db } from './_lib/db.js';
import { send, fail, allow, body, text, handler } from './_lib/http.js';
import { hashPassword, passwordProblem, createSession, normalizeUsername, validUsername, publicUser } from './_lib/auth.js';
import { schemaStatements } from './_lib/schema.js';

async function isInitialized() {
  const [t] = await db().q(`SELECT to_regclass('public.companies') AS t`);
  if (!t.t) return false;
  const [c] = await db().q(`SELECT count(*)::int AS n FROM companies`);
  return c.n > 0;
}

export default handler(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    return send(res, 200, { ok: true, initialized: await isInitialized() });
  }

  if (await isInitialized()) return fail(res, 403, 'El sistema ya fue configurado');

  const b = body(req);
  const companyName = text(b.companyName, 120);
  const nit = text(b.nit, 40);
  const name = text(b.name, 120);
  const username = normalizeUsername(b.username);
  const password = typeof b.password === 'string' ? b.password : '';

  if (!companyName) return fail(res, 400, 'Escribe el nombre de la empresa');
  if (!name) return fail(res, 400, 'Escribe tu nombre');
  if (!validUsername(username)) return fail(res, 400, 'El usuario debe tener entre 3 y 40 caracteres (letras, números, punto, guion)');
  const pp = passwordProblem(password);
  if (pp) return fail(res, 400, pp);

  for (const stmt of schemaStatements()) await db().q(stmt);
  if (await isInitialized()) return fail(res, 403, 'El sistema ya fue configurado');

  const [company] = await db().q(
    `INSERT INTO companies (name, nit) VALUES ($1, $2) RETURNING id, name, nit`,
    [companyName, nit || null]
  );
  const [user] = await db().q(
    `INSERT INTO users (company_id, username, name, role, password_hash, is_superadmin, last_login_at)
     VALUES ($1, $2, $3, 'Administrador', $4, true, now())
     RETURNING id, username, name, role, is_superadmin, company_id`,
    [company.id, username, name, hashPassword(password)]
  );
  await createSession(req, res, user, true);
  send(res, 200, { ok: true, user: publicUser(user), company: { id: company.id, name: company.name, nit: company.nit || '' } });
});
