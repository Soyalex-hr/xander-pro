// Autenticación: contraseñas cifradas con scrypt, sesiones con token aleatorio
// guardado como hash, cookie httpOnly (el JavaScript de la página no puede leerla).
import crypto from 'node:crypto';
import { db } from './db.js';
import { fail } from './http.js';

const COOKIE = 'xp_session';
export const ROLES = ['Administrador', 'Comercial', 'Operaciones', 'Consulta'];

// ---------- Contraseñas ----------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (password.length > 200) return 'La contraseña es demasiado larga';
  return null;
}

// ---------- Cookies ----------
function parseCookies(req) {
  const out = {};
  String(req.headers?.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isSecure(req) {
  const proto = req.headers?.['x-forwarded-proto'];
  const host = String(req.headers?.host || '');
  return proto === 'https' || (!proto && !host.startsWith('localhost') && !host.startsWith('127.0.0.1'));
}

function setCookie(req, res, value, maxAgeSeconds) {
  const parts = [`${COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (isSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');

// ---------- Sesiones ----------
export async function createSession(req, res, user, remember) {
  const token = crypto.randomBytes(32).toString('hex');
  const seconds = remember ? 30 * 24 * 3600 : 12 * 3600;
  await db().q(
    `INSERT INTO sessions (token_hash, user_id, company_id, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(secs => $4))`,
    [sha256(token), user.id, user.company_id, seconds]
  );
  // Limpieza ocasional de sesiones vencidas
  await db().q(`DELETE FROM sessions WHERE expires_at < now()`);
  setCookie(req, res, token, seconds);
}

export async function destroySession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) await db().q(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)]);
  setCookie(req, res, '', 0);
}

export async function getSession(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const rows = await db().q(
    `SELECT s.token_hash, u.id, u.username, u.name, u.role, u.is_superadmin, u.company_id,
            c.name AS company_name, c.nit AS company_nit
       FROM sessions s
       JOIN users u ON u.id = s.user_id AND u.active
       JOIN companies c ON c.id = s.company_id AND c.active
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
  return rows[0] || null;
}

export function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    isSuperadmin: !!u.is_superadmin,
    companyId: u.company_id
  };
}

export function publicCompany(u) {
  return { id: u.company_id, name: u.company_name, nit: u.company_nit || '' };
}

// Devuelve la sesión o responde 401/403 y devuelve null.
export async function requireSession(req, res, opts = {}) {
  const s = await getSession(req);
  if (!s) { fail(res, 401, 'Sesión no válida o vencida'); return null; }
  if (opts.admin && s.role !== 'Administrador') { fail(res, 403, 'Solo un administrador puede hacer esto'); return null; }
  if (opts.superadmin && !s.is_superadmin) { fail(res, 403, 'Solo el administrador principal puede hacer esto'); return null; }
  if (opts.write && s.role === 'Consulta') { fail(res, 403, 'Tu usuario es de solo lectura'); return null; }
  return s;
}

export function normalizeUsername(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function validUsername(v) {
  return /^[a-z0-9._-]{3,40}$/.test(v);
}
