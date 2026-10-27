import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { Db } from "./db";
import { TERMS_VERSION, fieldErrors, loginSchema, signupSchema } from "./validation";

/*
  Accounts and sessions. Each function takes the request's parts and
  returns what to send back, so it can be tested without a server.

  - Passwords: Argon2id (OWASP settings: 19 MiB, 2 passes).
  - Sessions: a random 256-bit token in an HttpOnly cookie; the database
    keeps only its SHA-256 hash.
  - Brute force: failed logins are counted per username+IP and per IP over
    15 minutes; sign-ups per IP over an hour.
*/

const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const SESSION_DAYS = 30;
const LIMITS = {
  /** Wrong passwords for one account from one IP. */
  loginPerAccount: { max: 5, minutes: 15 },
  /** Wrong passwords from one IP, across all accounts. */
  loginPerIp: { max: 20, minutes: 15 },
  signupPerIp: { max: 5, minutes: 60 },
};

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Result {
  status: number;
  body: Record<string, unknown>;
  /** A new session token to put in the cookie, or "" to clear it. */
  session?: string;
  retryAfterSeconds?: number;
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

// Checked when the username doesn't exist, so a wrong username takes as long
// as a wrong password and the timing doesn't reveal which accounts exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hash(randomBytes(16).toString("hex"), ARGON2));

// ---------- Rate limiting ----------

async function attempts(db: Db, key: string, minutes: number) {
  const { rows } = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM auth_attempts WHERE key = $1 AND at > now() - make_interval(mins => $2)",
    [key, minutes],
  );
  return rows[0]?.n ?? 0;
}

async function recordAttempt(db: Db, key: string) {
  await db.query("INSERT INTO auth_attempts (key) VALUES ($1)", [key]);
  // Keeps the table small; nothing older than a day is ever counted.
  await db.query("DELETE FROM auth_attempts WHERE at < now() - interval '1 day'");
}

const tooMany = (minutes: number): Result => ({
  status: 429,
  body: { error: `Too many tries. Please wait ${minutes} minutes and try again.` },
  retryAfterSeconds: minutes * 60,
});

// ---------- Sessions ----------

async function startSession(db: Db, userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))",
    [tokenHash(token), userId, SESSION_DAYS],
  );
  await db.query("DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()", [userId]);
  return token;
}

export async function currentUser(db: Db, token: string | undefined): Promise<User | null> {
  if (!token || token.length > 100) return null;
  const { rows } = await db.query<User>(
    `SELECT u.id, u.username, u.email FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}

// ---------- Endpoints ----------

export async function signup(db: Db, ip: string, input: unknown): Promise<Result> {
  const limit = LIMITS.signupPerIp;
  if ((await attempts(db, `signup:${ip}`, limit.minutes)) >= limit.max) return tooMany(limit.minutes);

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "Please check the form.", fields: fieldErrors(parsed.error) } };
  const { email, username, password } = parsed.data;

  await recordAttempt(db, `signup:${ip}`);
  const taken = await db.query<{ email: string; username_key: string }>(
    "SELECT email, username_key FROM users WHERE email = $1 OR username_key = $2",
    [email, username.toLowerCase()],
  );
  if (taken.rows.length > 0) {
    const fields: Record<string, string> = {};
    if (taken.rows.some((r) => r.username_key === username.toLowerCase())) fields.username = "That username is taken.";
    if (taken.rows.some((r) => r.email === email)) fields.email = "That email already has an account. Try signing in.";
    return { status: 409, body: { error: "Please check the form.", fields } };
  }

  const passwordHash = await hash(password, ARGON2);
  let id: string;
  try {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO users (email, username, username_key, password_hash, terms_version, terms_accepted_at)
       VALUES ($1, $2, $3, $4, $5, now()) RETURNING id`,
      [email, username, username.toLowerCase(), passwordHash, TERMS_VERSION],
    );
    id = rows[0]!.id;
  } catch (e) {
    // Someone took the name or email between the check and the insert.
    if ((e as { code?: string }).code === "23505") {
      return { status: 409, body: { error: "That username or email was just taken. Please try another." } };
    }
    throw e;
  }
  return { status: 201, body: { user: { id, username, email } }, session: await startSession(db, id) };
}

export async function login(db: Db, ip: string, input: unknown): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "Please check the form.", fields: fieldErrors(parsed.error) } };
  const { username, password } = parsed.data;
  const accountKey = `login:${username.toLowerCase()}:${ip}`;

  const { loginPerAccount: perAccount, loginPerIp: perIp } = LIMITS;
  if (
    (await attempts(db, accountKey, perAccount.minutes)) >= perAccount.max ||
    (await attempts(db, `login:${ip}`, perIp.minutes)) >= perIp.max
  ) {
    return tooMany(perAccount.minutes);
  }

  const { rows } = await db.query<User & { password_hash: string }>(
    "SELECT id, username, email, password_hash FROM users WHERE username_key = $1",
    [username.toLowerCase()],
  );
  const user = rows[0];
  const ok = await verify(user?.password_hash ?? (await getDummyHash()), password);
  if (!user || !ok) {
    await recordAttempt(db, accountKey);
    await recordAttempt(db, `login:${ip}`);
    // The same message either way, so it doesn't reveal which usernames exist.
    return { status: 401, body: { error: "Wrong username or password." } };
  }

  await db.query("DELETE FROM auth_attempts WHERE key = $1", [accountKey]);
  return {
    status: 200,
    body: { user: { id: user.id, username: user.username, email: user.email } },
    session: await startSession(db, user.id),
  };
}

export async function logout(db: Db, token: string | undefined): Promise<Result> {
  if (token && token.length <= 100) await db.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
  return { status: 200, body: { ok: true }, session: "" };
}

export async function me(db: Db, token: string | undefined): Promise<Result> {
  const user = await currentUser(db, token);
  // A cookie that no longer matches a session is cleared.
  return user ? { status: 200, body: { user } } : { status: 401, body: { user: null }, session: token ? "" : undefined };
}
