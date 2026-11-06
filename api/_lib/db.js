// Acceso a la base de datos (Neon Postgres por HTTP).
// db().q(texto, parametros) -> filas. En pruebas locales se inyecta un
// adaptador en globalThis.__XP_TEST_DB__ con la misma interfaz.
import { neon } from '@neondatabase/serverless';

let cached = null;

export function db() {
  if (globalThis.__XP_TEST_DB__) return globalThis.__XP_TEST_DB__;
  if (!cached) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL no está configurada en Vercel');
    const sql = neon(url);
    cached = { q: (text, params = []) => sql.query(text, params) };
  }
  return cached;
}
