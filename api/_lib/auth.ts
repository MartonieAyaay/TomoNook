import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { Db } from "./db";
import { BREACHED_MESSAGE, isBreached } from "./breached";
import { canSendEmail, sendEmail, type Email } from "./mail";
import {
  TERMS_VERSION,
  changePasswordSchema,
  deleteAccountSchema,
  fieldErrors,
  forgotSchema,
  loginSchema,
  resetSchema,
  signupSchema,
  verifySchema,
} from "./validation";

/*
  Accounts and sessions. Each function takes the request's parts and
  returns what to send back, so it can be tested without a server.

  - Passwords: Argon2id (OWASP settings: 19 MiB, 2 passes).
  - Sessions: a random 256-bit token in an HttpOnly cookie; the database
    keeps only its SHA-256 hash.
  - Leaked passwords: new passwords found in data breaches are refused (breached.ts).
  - Brute force: failed logins are counted per username+IP and per IP over
    15 minutes; sign-ups per IP over an hour.
  - Emails: a new account has to open the link sent to its email before it
    can log in. Signing up with an email that already has an account gives
    the same reply on screen (the email's owner is told instead), so the
    form can't be used to find out who uses TomoNook.
*/

const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const SESSION_DAYS = 30;
const LIMITS = {
  /** Wrong passwords for one account from one IP. */
  loginPerAccount: { max: 5, minutes: 15 },
  /** Wrong passwords from one IP, across all accounts. */
  loginPerIp: { max: 20, minutes: 15 },
  signupPerIp: { max: 5, minutes: 60 },
  /** Sign-ups with one email, so it can't be used to flood an inbox. */
  signupPerEmail: { max: 3, minutes: 60 },
  /** "Send the link again" for one account. */
  resendPerAccount: { max: 3, minutes: 60 },
  /** Guesses at confirm links. */
  verifyPerIp: { max: 10, minutes: 15 },
  /** "Forgot password?" requests, so it can't be used to flood someone's inbox. */
  forgotPerIp: { max: 5, minutes: 60 },
  forgotPerEmail: { max: 3, minutes: 60 },
  /** Guesses at reset links. */
  resetPerIp: { max: 10, minutes: 15 },
};

/** How long a reset link works. */
export const RESET_MINUTES = 30;
/** How long a "confirm your email" link works. Unconfirmed accounts are removed after this, freeing their name and email. */
export const VERIFY_HOURS = 24;

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
  await tidyUp(db);
}

// ---------- Housekeeping ----------

const TIDY_EVERY_MS = 60 * 60 * 1000;
let lastTidy = 0;

/**
  Removes what's no longer needed: expired sessions and links, sign-ups
  never confirmed, and attempt records older than any limit counts (a day).
  Runs at most once an hour per server instance, on the next login or sign-up.
*/
export async function tidyUp(db: Db, force = false) {
  if (!force && Date.now() - lastTidy < TIDY_EVERY_MS) return;
  lastTidy = Date.now();
  await db.query("DELETE FROM sessions WHERE expires_at < now()");
  await db.query("DELETE FROM password_resets WHERE expires_at < now()");
  await db.query("DELETE FROM email_verifications WHERE expires_at < now()");
  await db.query("DELETE FROM auth_attempts WHERE at < now() - interval '1 day'");
  await db.query("DELETE FROM users WHERE email_verified_at IS NULL AND created_at < now() - make_interval(hours => $1)", [
    VERIFY_HOURS,
  ]);
}

const breached: Result = { status: 400, body: { error: "Please check the form.", fields: { password: BREACHED_MESSAGE } } };

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
  await tidyUp(db);
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

const SIGNUP_REPLY = (email: string) =>
  `We sent a link to ${email}. Open it within ${VERIFY_HOURS} hours to finish signing up (check spam too).`;

export async function signup(db: Db, ip: string, input: unknown): Promise<Result> {
  const limit = LIMITS.signupPerIp;
  if ((await attempts(db, `signup:${ip}`, limit.minutes)) >= limit.max) return tooMany(limit.minutes);

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "Please check the form.", fields: fieldErrors(parsed.error) } };
  const { email, username, password } = parsed.data;
  if (!canSendEmail()) return { status: 503, body: { error: "Signing up isn’t available right now. Please try again later." } };
  // Before looking up the email, so this answer is the same whether or not it has an account.
  if (await isBreached(password)) return breached;
  const perEmail = LIMITS.signupPerEmail;
  if ((await attempts(db, `signup:${email}`, perEmail.minutes)) >= perEmail.max) return tooMany(perEmail.minutes);

  await recordAttempt(db, `signup:${ip}`);
  await recordAttempt(db, `signup:${email}`);
  // Sign-ups never confirmed in time give their name and email back.
  await db.query("DELETE FROM users WHERE email_verified_at IS NULL AND created_at < now() - make_interval(hours => $1)", [
    VERIFY_HOURS,
  ]);

  const pending: Result = { status: 202, body: { pending: true, message: SIGNUP_REPLY(email) } };
  const existing = await db.query<{ username: string }>("SELECT username FROM users WHERE email = $1", [email]);
  if (existing.rows[0]) {
    // The same reply as a new sign-up; the email's owner hears about it instead.
    await sendQuietly({ to: email, ...existingAccountEmail(existing.rows[0].username) });
    return pending;
  }
  // Usernames are shown to the user anyway, so saying one is taken gives nothing away.
  const taken = await db.query("SELECT 1 FROM users WHERE username_key = $1", [username.toLowerCase()]);
  if (taken.rows.length > 0) {
    return { status: 409, body: { error: "Please check the form.", fields: { username: "That username is taken." } } };
  }

  const passwordHash = await hash(password, ARGON2);
  let id: string;
  try {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO users (email, username, username_key, password_hash, terms_version, terms_accepted_at, age_confirmed_at)
       VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id`,
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
  try {
    await sendVerification(db, id, email, username);
  } catch (e) {
    // Without the email they could never log in, so the sign-up is undone.
    console.error("Couldn't send the confirm email:", e);
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    return { status: 503, body: { error: "We couldn’t send the email to finish signing up. Please try again later." } };
  }
  return pending;
}

export async function login(db: Db, ip: string, input: unknown): Promise<Result> {
  const checked = await checkPassword(db, ip, input);
  if ("result" in checked) return checked.result;
  const { user } = checked;
  if (!user.email_verified_at) {
    // Only said after the right password, so it doesn't reveal anything to a stranger.
    return {
      status: 403,
      body: { error: `Please confirm your email first: open the link we sent to ${user.email}.`, unverified: true },
    };
  }
  return {
    status: 200,
    body: { user: { id: user.id, username: user.username, email: user.email } },
    session: await startSession(db, user.id),
  };
}

type CheckedUser = User & { password_hash: string; email_verified_at: Date | null };

/** The username and password check shared by logging in and "Send the link again". */
async function checkPassword(db: Db, ip: string, input: unknown): Promise<{ user: CheckedUser } | { result: Result }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { result: { status: 400, body: { error: "Please check the form.", fields: fieldErrors(parsed.error) } } };
  }
  const { username, password } = parsed.data;
  const accountKey = `login:${username.toLowerCase()}:${ip}`;

  const { loginPerAccount: perAccount, loginPerIp: perIp } = LIMITS;
  if (
    (await attempts(db, accountKey, perAccount.minutes)) >= perAccount.max ||
    (await attempts(db, `login:${ip}`, perIp.minutes)) >= perIp.max
  ) {
    return { result: tooMany(perAccount.minutes) };
  }

  const { rows } = await db.query<CheckedUser>(
    "SELECT id, username, email, password_hash, email_verified_at FROM users WHERE username_key = $1",
    [username.toLowerCase()],
  );
  const user = rows[0];
  const ok = await verify(user?.password_hash ?? (await getDummyHash()), password);
  if (!user || !ok) {
    await recordAttempt(db, accountKey);
    await recordAttempt(db, `login:${ip}`);
    // The same message either way, so it doesn't reveal which usernames exist.
    return { result: { status: 401, body: { error: "Wrong username or password." } } };
  }
  await db.query("DELETE FROM auth_attempts WHERE key = $1", [accountKey]);
  return { user };
}

/** "Send the link again", from the login window (it needs the password, so only the account's owner can ask). */
export async function resendVerification(db: Db, ip: string, input: unknown): Promise<Result> {
  const checked = await checkPassword(db, ip, input);
  if ("result" in checked) return checked.result;
  const { user } = checked;
  if (user.email_verified_at) return { status: 200, body: { message: "Your email is already confirmed. You can log in." } };
  const limit = LIMITS.resendPerAccount;
  if ((await attempts(db, `resend:${user.id}`, limit.minutes)) >= limit.max) return tooMany(limit.minutes);
  await recordAttempt(db, `resend:${user.id}`);
  try {
    await sendVerification(db, user.id, user.email, user.username);
  } catch (e) {
    console.error("Couldn't send the confirm email:", e);
    return { status: 503, body: { error: "We couldn’t send the email right now. Please try again later." } };
  }
  return { status: 200, body: { message: `We sent a new link to ${user.email}. Check your inbox (and spam).` } };
}

/** Opened from the emailed link: the email is confirmed, and they're logged in. */
export async function verifyEmail(db: Db, ip: string, input: unknown): Promise<Result> {
  const limit = LIMITS.verifyPerIp;
  if ((await attempts(db, `verify:${ip}`, limit.minutes)) >= limit.max) return tooMany(limit.minutes);
  const invalid: Result = {
    status: 400,
    body: { error: "This link has expired or was already used. Log in to get a new one." },
  };
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return invalid;

  const { rows } = await db.query<User>(
    `SELECT u.id, u.username, u.email FROM email_verifications v JOIN users u ON u.id = v.user_id
     WHERE v.token_hash = $1 AND v.expires_at > now()`,
    [tokenHash(parsed.data.token)],
  );
  const user = rows[0];
  if (!user) {
    await recordAttempt(db, `verify:${ip}`);
    return invalid;
  }
  await db.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1", [user.id]);
  await db.query("DELETE FROM email_verifications WHERE user_id = $1", [user.id]);
  return { status: 200, body: { user }, session: await startSession(db, user.id) };
}

async function sendVerification(db: Db, userId: string, email: string, username: string) {
  // Only the newest link works.
  await db.query("DELETE FROM email_verifications WHERE user_id = $1", [userId]);
  const token = randomBytes(32).toString("base64url");
  await db.query(
    "INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(hours => $3))",
    [tokenHash(token), userId, VERIFY_HOURS],
  );
  await sendEmail({ to: email, ...verifyMessage(username, `${appUrl()}/?verify=${token}`) });
}

/** For emails whose failure mustn't change the reply (so it doesn't reveal that an account exists). */
async function sendQuietly(email: Email) {
  try {
    await sendEmail(email);
  } catch (e) {
    console.error("Couldn't send email:", e);
  }
}

export async function logout(db: Db, token: string | undefined): Promise<Result> {
  if (token && token.length <= 100) await db.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
  return { status: 200, body: { ok: true }, session: "" };
}

// ---------- Account settings (signed in) ----------

const signedOut: Result = { status: 401, body: { error: "Please log in again." } };

/** Checks the signed-in user's password, limiting wrong guesses like logins do. */
async function confirmPassword(db: Db, user: User, password: string): Promise<Result | null> {
  const limit = LIMITS.loginPerAccount;
  const key = `confirm:${user.id}`;
  if ((await attempts(db, key, limit.minutes)) >= limit.max) return tooMany(limit.minutes);
  const { rows } = await db.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (rows[0] && (await verify(rows[0].password_hash, password))) return null;
  await recordAttempt(db, key);
  return { status: 400, body: { error: "Please check the form.", fields: { currentPassword: "That isn’t your password." } } };
}

/** A new password. Every other device is logged out; this one stays. */
export async function changePassword(db: Db, token: string | undefined, input: unknown): Promise<Result> {
  const user = await currentUser(db, token);
  if (!user) return signedOut;
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "Please check the form.", fields: fieldErrors(parsed.error) } };
  const { currentPassword, password } = parsed.data;
  if (password.toLowerCase() === user.username.toLowerCase()) {
    return { status: 400, body: { error: "Please check the form.", fields: { password: "Your password can’t be your username." } } };
  }
  if (await isBreached(password)) return breached;
  const wrong = await confirmPassword(db, user, currentPassword);
  if (wrong) return wrong;

  await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hash(password, ARGON2), user.id]);
  await db.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [user.id, tokenHash(token!)]);
  return { status: 200, body: { message: "Your password is changed. Other devices were logged out." } };
}

/** "Log out other devices": ends every session but this one. */
export async function logoutOthers(db: Db, token: string | undefined): Promise<Result> {
  const user = await currentUser(db, token);
  if (!user) return signedOut;
  const { rows } = await db.query<{ token_hash: string }>(
    "DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2 RETURNING token_hash",
    [user.id, tokenHash(token!)],
  );
  const n = rows.length;
  return {
    status: 200,
    body: { message: n === 0 ? "No other devices were logged in." : `Logged out ${n} other ${n === 1 ? "device" : "devices"}.` },
  };
}

/** Deletes the account and everything in it (sessions, links and app data go with it). Needs the password. */
export async function deleteAccount(db: Db, token: string | undefined, input: unknown): Promise<Result> {
  const user = await currentUser(db, token);
  if (!user) return signedOut;
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "Please check the form.", fields: fieldErrors(parsed.error) } };
  const wrong = await confirmPassword(db, user, parsed.data.currentPassword);
  if (wrong) return wrong;

  await db.query("DELETE FROM users WHERE id = $1", [user.id]);
  await db.query("DELETE FROM auth_attempts WHERE key LIKE $1 OR key = $2 OR key = $3", [
    `login:${user.username.toLowerCase()}:%`,
    `confirm:${user.id}`,
    `resend:${user.id}`,
  ]);
  return { status: 200, body: { ok: true }, session: "" };
}

export async function me(db: Db, token: string | undefined): Promise<Result> {
  const user = await currentUser(db, token);
  // A cookie that no longer matches a session is cleared.
  return user ? { status: 200, body: { user } } : { status: 401, body: { user: null }, session: token ? "" : undefined };
}

// ---------- Emails ----------

/** The site's address for links in emails. Never taken from the request, which could be forged. */
function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:5173";
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A TomoNook email: a heading, a few lines, an optional button, and a closing line. Plain-text copy included. */
function message(m: {
  subject: string;
  heading: string;
  username: string;
  lines: string[];
  button?: { label: string; link: string };
  footer: string;
}) {
  const { button } = m;
  const text = [
    `Hi ${m.username},`,
    ...m.lines,
    ...(button ? [button.link] : []),
    m.footer,
    "TomoNook",
  ].join("\n\n");
  const link = button && escapeHtml(button.link);
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#fff6de;border:6px solid #e66b33;border-radius:20px;color:#6e3f39">
  <h1 style="margin:0 0 12px;color:#29512f;font-size:26px">${escapeHtml(m.heading)}</h1>
  <p>Hi ${escapeHtml(m.username)},</p>
  ${m.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("\n  ")}
  ${
    button
      ? `<p style="text-align:center;margin:24px 0"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#e66b33;color:#fff6de;border-radius:12px;text-decoration:none;font-weight:bold;font-size:18px">${escapeHtml(button.label)}</a></p>
  <p style="font-size:13px">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all">${link}</span></p>`
      : ""
  }
  <p style="font-size:13px">${escapeHtml(m.footer)}</p>
</div>`;
  return { subject: m.subject, text, html };
}

const verifyMessage = (username: string, link: string) =>
  message({
    subject: "Confirm your TomoNook email",
    heading: "Welcome to TomoNook!",
    username,
    lines: [`To finish signing up, confirm this is your email within ${VERIFY_HOURS} hours:`],
    button: { label: "Confirm my email", link },
    footer: "If you didn't sign up for TomoNook, you can ignore this email and the account won't be made.",
  });

const existingAccountEmail = (username: string) =>
  message({
    subject: "Someone tried to sign up with your email",
    heading: "You already have an account",
    username,
    lines: [
      `Someone just tried to make a new TomoNook account with this email, but it already belongs to your account, "${username}".`,
      `If that was you, log in at ${appUrl()} instead. Forgot your password? Press "Forgot password?" in the login window.`,
    ],
    footer: "If it wasn't you, you can ignore this email. Nothing about your account has changed.",
  });

const resetEmail = (username: string, link: string) =>
  message({
    subject: "Reset your TomoNook password",
    heading: "Reset your password",
    username,
    lines: [`Someone asked to reset the password for your TomoNook account. To choose a new one, press the button within ${RESET_MINUTES} minutes:`],
    button: { label: "Choose a new password", link },
    footer: "If it wasn't you, you can ignore this email. Your password stays the same.",
  });

// ---------- Forgot / reset password ----------

const FORGOT_REPLY =
  "If an account uses that email, we’ve sent it a link to reset the password. Check your inbox (and spam). The link works for 30 minutes.";

export async function forgotPassword(db: Db, ip: string, input: unknown): Promise<Result> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "Please check the form.", fields: fieldErrors(parsed.error) } };
  const { email } = parsed.data;
  if (!canSendEmail()) return { status: 503, body: { error: "Password reset isn’t available right now. Please try again later." } };

  const { forgotPerIp: perIp, forgotPerEmail: perEmail } = LIMITS;
  if (
    (await attempts(db, `forgot:${ip}`, perIp.minutes)) >= perIp.max ||
    (await attempts(db, `forgot:${email}`, perEmail.minutes)) >= perEmail.max
  ) {
    return tooMany(perIp.minutes);
  }
  await recordAttempt(db, `forgot:${ip}`);
  await recordAttempt(db, `forgot:${email}`);

  const { rows } = await db.query<{ id: string; username: string }>("SELECT id, username FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if (user) {
    // Only the newest link works.
    await db.query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
    const token = randomBytes(32).toString("base64url");
    await db.query(
      "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))",
      [tokenHash(token), user.id, RESET_MINUTES],
    );
    try {
      await sendEmail({ to: email, ...resetEmail(user.username, `${appUrl()}/?reset=${token}`) });
    } catch (e) {
      // Logged for us; the reply stays the same so it doesn't reveal that the account exists.
      console.error("Couldn't send reset email:", e);
    }
  }
  // The same answer whether or not the email has an account.
  return { status: 200, body: { message: FORGOT_REPLY } };
}

export async function resetPassword(db: Db, ip: string, input: unknown): Promise<Result> {
  const limit = LIMITS.resetPerIp;
  if ((await attempts(db, `reset:${ip}`, limit.minutes)) >= limit.max) return tooMany(limit.minutes);

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    if (fields.token) return { status: 400, body: { error: "This reset link isn’t valid. Ask for a new one." } };
    return { status: 400, body: { error: "Please check the form.", fields } };
  }
  const { token, password } = parsed.data;

  const { rows } = await db.query<User>(
    `SELECT u.id, u.username, u.email FROM password_resets r JOIN users u ON u.id = r.user_id
     WHERE r.token_hash = $1 AND r.expires_at > now()`,
    [tokenHash(token)],
  );
  const user = rows[0];
  if (!user) {
    await recordAttempt(db, `reset:${ip}`);
    return { status: 400, body: { error: "This reset link has expired or was already used. Ask for a new one." } };
  }
  if (password.toLowerCase() === user.username.toLowerCase()) {
    return { status: 400, body: { error: "Please check the form.", fields: { password: "Your password can’t be your username." } } };
  }
  if (await isBreached(password)) return breached;

  // The link came to their inbox, so it confirms the email too.
  await db.query("UPDATE users SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $2", [
    await hash(password, ARGON2),
    user.id,
  ]);
  // The link is used up, and every device that was logged in is logged out.
  await db.query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
  await db.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
  await db.query("DELETE FROM auth_attempts WHERE key LIKE $1", [`login:${user.username.toLowerCase()}:%`]);
  return { status: 200, body: { user }, session: await startSession(db, user.id) };
}
