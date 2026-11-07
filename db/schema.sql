-- =====================================================================
-- Xander Pro — Esquema de base de datos (Neon Postgres)
-- Multiempresa: cada registro pertenece a una empresa (company_id) y
-- cada usuario solo puede leer/escribir los datos de su empresa.
-- Ejecutar una vez en el SQL Editor de Neon (es idempotente).
-- =====================================================================

-- Empresas (inquilinos)
CREATE TABLE IF NOT EXISTS companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  nit         text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Usuarios: pertenecen a una empresa. La contraseña se guarda cifrada
-- (scrypt con sal), nunca en texto plano. El usuario es único en todo el
-- sistema para que el login no tenga que pedir la empresa.
CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  username       text NOT NULL,
  name           text NOT NULL,
  role           text NOT NULL DEFAULT 'Operador',   -- Administrador | Operador | Consulta
  password_hash  text NOT NULL,                      -- formato: scrypt$<sal>$<hash>
  active         boolean NOT NULL DEFAULT true,
  is_superadmin  boolean NOT NULL DEFAULT false,     -- puede crear y ver empresas
  failed_attempts integer NOT NULL DEFAULT 0,        -- protección contra fuerza bruta
  locked_until   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);
-- Columnas agregadas después de la primera versión (idempotente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uq ON users (lower(username));
CREATE INDEX IF NOT EXISTS users_company_idx ON users (company_id);

-- Sesiones: se guarda solo el hash del token (si alguien lee la tabla no
-- puede usar los tokens). Expiran solas.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Registros de la aplicación.
-- Una fila por registro (un cliente, una cabaña, una cotización...).
-- "collection" corresponde a las listas que hoy existen en el estado de la app:
--   clients, products, savedQuotes, finances, eventTypes, cabins,
--   childPolicies, mealPlans, tourServices, cabinQuotes, eventClosures,
--   notifications, settings (company, shoppingLists, priceHistory...)
-- "data" guarda el registro tal como lo usa la app (JSON), así la lógica
-- actual se conserva. Más adelante se pueden pasar a columnas propias
-- las colecciones que necesiten reportes (finanzas, rentabilidad).
CREATE TABLE IF NOT EXISTS records (
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  collection  text NOT NULL,
  id          text NOT NULL,
  data        jsonb NOT NULL,
  version     integer NOT NULL DEFAULT 1,              -- control de conflictos entre dispositivos
  deleted     boolean NOT NULL DEFAULT false,          -- borrado lógico para sincronizar eliminaciones
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (company_id, collection, id)
);
-- Sincronización incremental: "dame lo que cambió desde X"
CREATE INDEX IF NOT EXISTS records_sync_idx ON records (company_id, updated_at, collection, id);
CREATE INDEX IF NOT EXISTS records_collection_idx ON records (company_id, collection) WHERE NOT deleted;

-- Bitácora de cambios (quién cambió qué y cuándo). Útil para auditoría
-- y para recuperar datos borrados por error.
CREATE TABLE IF NOT EXISTS record_history (
  history_id  bigserial PRIMARY KEY,
  company_id  uuid NOT NULL,
  collection  text NOT NULL,
  id          text NOT NULL,
  data        jsonb,
  deleted     boolean NOT NULL DEFAULT false,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid
);
CREATE INDEX IF NOT EXISTS record_history_lookup_idx ON record_history (company_id, collection, id, changed_at DESC);

-- Correo de la empresa para enviar cotizaciones (SMTP). La contraseña va cifrada.
CREATE TABLE IF NOT EXISTS company_mail (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  settings   jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret     text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
