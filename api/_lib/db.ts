import { Pool } from "pg";

/*
  The database the auth code talks to. Every query goes through query(),
  always with $1-style parameters, never with values pasted into the SQL.

  On Vercel this is PostgreSQL from DATABASE_URL. The local dev server can
  swap in an embedded Postgres instead (see server/src/devDb.ts), so the
  app runs without setting up a database.
*/

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

let db: Db | null = null;
let ready: Promise<void> | null = null;

export function setDb(next: Db) {
  db = next;
  ready = null;
}

/** Thrown when no database address is set, so the API can say so plainly. */
export class DatabaseNotSetUp extends Error {
  constructor() {
    super("No database address: set DATABASE_URL (Vercel → Storage → connect a Neon database to this project)");
  }
}

/*
  The database address. Neon on Vercel sets DATABASE_URL, but a custom
  prefix in the integration renames it (e.g. STORAGE_DATABASE_URL), so any
  variable holding a postgres:// address is accepted, pooled ones first.
*/
function databaseUrl() {
  const env = process.env;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  const candidates = Object.entries(env)
    .filter(([, v]) => v && /^postgres(ql)?:\/\//.test(v))
    .sort(([a], [b]) => Number(/UNPOOLED|NON_POOLING/.test(a)) - Number(/UNPOOLED|NON_POOLING/.test(b)));
  return candidates[0]?.[1];
}

function getDb(): Db {
  if (db) return db;
  const url = databaseUrl();
  if (!url) throw new DatabaseNotSetUp();
  const pool = new Pool({ connectionString: url, max: 3 });
  db = { query: (text, params) => pool.query(text, params) as never };
  return db;
}

/** The database, with its tables created on first use. */
export async function database(): Promise<Db> {
  const d = getDb();
  ready ??= createTables(d).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return d;
}

async function createTables(d: Db) {
  await d.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email             text NOT NULL UNIQUE,
      username          text NOT NULL,
      username_key      text NOT NULL UNIQUE,
      password_hash     text NOT NULL,
      terms_version     text NOT NULL,
      terms_accepted_at timestamptz NOT NULL,
      created_at        timestamptz NOT NULL DEFAULT now()
    )`);
  // Only a hash of each session token is stored, so a leaked table can't be used to log in.
  await d.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )`);
  // Password reset links: only the token's hash is stored, and each works once.
  await d.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash text PRIMARY KEY,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    )`);
  // When the email was confirmed (the sign-up link, or a reset link). Accounts made
  // before confirming existed count as confirmed, so nobody is locked out; new
  // accounts start unconfirmed (null).
  await d.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz DEFAULT now()`);
  await d.query(`ALTER TABLE users ALTER COLUMN email_verified_at DROP DEFAULT`);
  // When they ticked a separate "13 or older" box. No longer asked (the Terms cover the age),
  // so null for new accounts; kept for the accounts that did.
  await d.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz`);
  // "Confirm your email" links: only the token's hash is stored, and each works once.
  await d.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      token_hash text PRIMARY KEY,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    )`);
  await d.query(`
    CREATE TABLE IF NOT EXISTS auth_attempts (
      key text NOT NULL,
      at  timestamptz NOT NULL DEFAULT now()
    )`);
  await d.query(`CREATE INDEX IF NOT EXISTS auth_attempts_key_at ON auth_attempts (key, at)`);
  // For deleting a user's rows, and for the hourly clean-up of expired ones (auth.ts tidyUp).
  await d.query(`CREATE INDEX IF NOT EXISTS auth_attempts_at ON auth_attempts (at)`);
  await d.query(`CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id)`);
  await d.query(`CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions (expires_at)`);
  await d.query(`CREATE INDEX IF NOT EXISTS password_resets_user_id ON password_resets (user_id)`);
  await d.query(`CREATE INDEX IF NOT EXISTS email_verifications_user_id ON email_verifications (user_id)`);
  // Each account's app data, one value per key (see data.ts). Deleted with the account.
  await d.query(`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key        text NOT NULL,
      value      text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, key)
    )`);
}
