import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  VERIFY_HOURS,
  changePassword,
  currentUser,
  deleteAccount,
  forgotPassword,
  login,
  logout,
  logoutOthers,
  me,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} from "./auth";
import { setBreachCheck } from "./breached";
import { setMailer, type Email } from "./mail";
import { database, setDb, type Db } from "./db";

let db: Db;
let sent: Email[];

beforeEach(async () => {
  const pg = new PGlite();
  setDb({ query: (text, params) => pg.query(text, params) as never });
  db = await database();
  sent = [];
  setMailer(async (e) => void sent.push(e));
  // Only "password123" counts as leaked here, so tests never call the real service.
  setBreachCheck(async (p) => p === "password123");
});

const form = {
  email: "Tomato@Example.com",
  username: "tomato_fan",
  password: "ripe and juicy",
  retypePassword: "ripe and juicy",
  acceptTerms: true,
  ageConfirmed: true,
};

/** The token in an emailed link, e.g. ?verify=... or ?reset=... */
const linkToken = (email: Email, param: string) => new RegExp(`[?&]${param}=([\\w-]+)`).exec(email.text)![1]!;

/** Signs up and opens the emailed link, as a new user would. */
async function signedUp(ip: string, f = form) {
  await signup(db, ip, f);
  return verifyEmail(db, ip, { token: linkToken(sent.at(-1)!, "verify") });
}

const userCount = async () => (await db.query("SELECT 1 FROM users")).rows.length;

describe("signup", () => {
  it("makes an unconfirmed account and emails a link that logs in, storing only hashes", async () => {
    const res = await signup(db, "1.1.1.1", form);
    expect(res.status).toBe(202);
    expect(res.session).toBeUndefined();
    const { rows } = await db.query<{ email: string; password_hash: string; email_verified_at: Date | null }>(
      "SELECT * FROM users",
    );
    expect(rows[0]!.email).toBe("tomato@example.com");
    expect(rows[0]!.password_hash).toMatch(/^\$argon2id\$/);
    expect(rows[0]!.email_verified_at).toBeNull();
    expect(sent[0]!.to).toBe("tomato@example.com");

    const token = linkToken(sent[0]!, "verify");
    const stored = await db.query<{ token_hash: string }>("SELECT token_hash FROM email_verifications");
    expect(stored.rows[0]!.token_hash).not.toBe(token);
    const verified = await verifyEmail(db, "1.1.1.1", { token });
    expect(verified.status).toBe(200);
    expect(verified.session).toMatch(/^[\w-]{43}$/);
    const sessions = await db.query<{ token_hash: string }>("SELECT token_hash FROM sessions");
    expect(sessions.rows[0]!.token_hash).not.toBe(verified.session);
    expect(await currentUser(db, verified.session)).toMatchObject({ username: "tomato_fan" });
    // The link works once.
    expect((await verifyEmail(db, "1.1.1.1", { token })).status).toBe(400);
  });

  it("requires the terms, the age check, matching passwords and a valid email", async () => {
    const res = await signup(db, "1.1.1.1", { ...form, email: "nope", retypePassword: "x", acceptTerms: false, ageConfirmed: false });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields as object).sort()).toEqual(["acceptTerms", "ageConfirmed", "email", "retypePassword"]);
  });

  it("rejects a taken username, whatever its case", async () => {
    await signup(db, "1.1.1.1", form);
    const res = await signup(db, "1.1.1.1", { ...form, email: "other@example.com", username: "TOMATO_FAN" });
    expect(res.status).toBe(409);
    expect(res.body.fields).toHaveProperty("username");
  });

  it("gives the same reply for an email that already has an account, and tells its owner", async () => {
    const first = await signup(db, "1.1.1.1", form);
    await verifyEmail(db, "1.1.1.1", { token: linkToken(sent[0]!, "verify") });
    const again = await signup(db, "2.2.2.2", { ...form, username: "someone_else" });
    expect(again).toEqual(first);
    expect(await userCount()).toBe(1);
    expect(sent[1]!.to).toBe("tomato@example.com");
    expect(sent[1]!.text).toContain("already belongs to your account");
  });

  it("treats SQL in the input as plain text", async () => {
    const res = await signup(db, "1.1.1.1", { ...form, username: "x'; DROP TABLE users;--" });
    expect(res.status).toBe(400);
    const res2 = await login(db, "1.1.1.1", { username: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res2.status).toBe(401);
    expect((await db.query("SELECT 1 FROM users")).rows).toBeDefined();
  });

  it("limits sign-ups from one IP, and to one email", async () => {
    for (let i = 0; i < 5; i++) await signup(db, "2.2.2.2", { ...form, email: `a${i}@x.com`, username: `user${i}` });
    expect((await signup(db, "2.2.2.2", { ...form, email: "late@x.com", username: "late" })).status).toBe(429);

    for (let i = 0; i < 3; i++) await signup(db, `3.3.3.${i}`, { ...form, email: "flood@x.com", username: `flood${i}` });
    expect((await signup(db, "3.3.3.9", { ...form, email: "flood@x.com", username: "flood9" })).status).toBe(429);
  });

  it("frees the name and email of a sign-up that was never confirmed", async () => {
    await signup(db, "1.1.1.1", form);
    await db.query(`UPDATE users SET created_at = now() - interval '${VERIFY_HOURS + 1} hours'`);
    expect((await signup(db, "2.2.2.2", form)).status).toBe(202);
    expect(await userCount()).toBe(1);
    expect(sent[1]!.subject).toContain("Confirm");
  });

  it("undoes the sign-up if the email can't be sent", async () => {
    setMailer(async () => {
      throw new Error("SMTP down");
    });
    expect((await signup(db, "1.1.1.1", form)).status).toBe(503);
    expect(await userCount()).toBe(0);
  });
});

describe("login", () => {
  beforeEach(async () => {
    await signedUp("9.9.9.9");
  });

  it("logs in with the right password, any username case", async () => {
    const res = await login(db, "1.1.1.1", { username: "Tomato_Fan", password: form.password });
    expect(res.status).toBe(200);
    expect(res.session).toBeTruthy();
  });

  it("gives the same answer for a wrong password and an unknown user", async () => {
    const wrong = await login(db, "1.1.1.1", { username: "tomato_fan", password: "nope nope" });
    const unknown = await login(db, "1.1.1.1", { username: "nobody", password: "nope nope" });
    expect(wrong).toEqual(unknown);
    expect(wrong.status).toBe(401);
  });

  it("locks an account+IP after 5 wrong passwords for 15 minutes", async () => {
    for (let i = 0; i < 5; i++) await login(db, "1.1.1.1", { username: "tomato_fan", password: "wrong pass" });
    const locked = await login(db, "1.1.1.1", { username: "tomato_fan", password: form.password });
    expect(locked.status).toBe(429);
    expect(locked.retryAfterSeconds).toBe(900);
    // Another IP isn't blocked by someone else's guesses.
    expect((await login(db, "3.3.3.3", { username: "tomato_fan", password: form.password })).status).toBe(200);
  });

  it("asks an unconfirmed account to confirm, and resends the link only with the password", async () => {
    const other = { ...form, email: "new@example.com", username: "newbie" };
    await signup(db, "1.1.1.1", other);
    const first = linkToken(sent.at(-1)!, "verify");
    const res = await login(db, "1.1.1.1", { username: "newbie", password: other.password });
    expect(res.status).toBe(403);
    expect(res.body.unverified).toBe(true);
    expect(res.session).toBeUndefined();

    expect((await resendVerification(db, "1.1.1.1", { username: "newbie", password: "wrong pass" })).status).toBe(401);
    expect((await resendVerification(db, "1.1.1.1", { username: "newbie", password: other.password })).status).toBe(200);
    // Only the newest link works.
    expect((await verifyEmail(db, "1.1.1.1", { token: first })).status).toBe(400);
    expect((await verifyEmail(db, "1.1.1.1", { token: linkToken(sent.at(-1)!, "verify") })).status).toBe(200);
    expect((await login(db, "1.1.1.1", { username: "newbie", password: other.password })).status).toBe(200);
  });
});

describe("sessions", () => {
  it("logout ends the session and clears the cookie", async () => {
    const { session } = await signedUp("1.1.1.1");
    expect((await me(db, session)).status).toBe(200);
    const out = await logout(db, session);
    expect(out.session).toBe("");
    expect((await me(db, session)).status).toBe(401);
  });

  it("rejects made-up and expired tokens", async () => {
    expect((await me(db, "made-up")).status).toBe(401);
    const { session } = await signedUp("1.1.1.1");
    await db.query("UPDATE sessions SET expires_at = now() - interval '1 minute'");
    expect(await currentUser(db, session)).toBeNull();
  });
});

describe("forgot / reset password", () => {
  const resetToken = (email: Email) => linkToken(email, "reset");

  beforeEach(async () => {
    await signedUp("9.9.9.9");
    sent.length = 0;
  });

  it("emails a one-time link, and gives the same reply for unknown emails", async () => {
    const known = await forgotPassword(db, "1.1.1.1", { email: "TOMATO@example.com" });
    const unknown = await forgotPassword(db, "1.1.1.1", { email: "nobody@example.com" });
    expect(known).toEqual(unknown);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("tomato@example.com");
    const stored = await db.query<{ token_hash: string }>("SELECT token_hash FROM password_resets");
    expect(stored.rows[0]!.token_hash).not.toBe(resetToken(sent[0]!));
  });

  it("resets the password, logs out other devices, and the link works once", async () => {
    const old = await login(db, "1.1.1.1", { username: "tomato_fan", password: form.password });
    await forgotPassword(db, "1.1.1.1", { email: form.email });
    const token = resetToken(sent[0]!);
    const res = await resetPassword(db, "1.1.1.1", { token, password: "brand new pass", retypePassword: "brand new pass" });
    expect(res.status).toBe(200);
    expect(res.session).toBeTruthy();
    expect(await currentUser(db, old.session)).toBeNull();
    expect((await login(db, "1.1.1.1", { username: "tomato_fan", password: form.password })).status).toBe(401);
    expect((await login(db, "1.1.1.1", { username: "tomato_fan", password: "brand new pass" })).status).toBe(200);
    const again = await resetPassword(db, "1.1.1.1", { token, password: "another pass 1", retypePassword: "another pass 1" });
    expect(again.status).toBe(400);
  });

  it("rejects expired and made-up links", async () => {
    await forgotPassword(db, "1.1.1.1", { email: form.email });
    const token = resetToken(sent[0]!);
    await db.query("UPDATE password_resets SET expires_at = now() - interval '1 minute'");
    expect((await resetPassword(db, "1.1.1.1", { token, password: "brand new pass", retypePassword: "brand new pass" })).status).toBe(400);
    expect((await resetPassword(db, "1.1.1.1", { token: "x".repeat(43), password: "brand new pass", retypePassword: "brand new pass" })).status).toBe(400);
  });

  it("limits requests per email so an inbox can't be flooded", async () => {
    for (let i = 0; i < 3; i++) await forgotPassword(db, `5.5.5.${i}`, { email: form.email });
    expect((await forgotPassword(db, "5.5.5.9", { email: form.email })).status).toBe(429);
    expect(sent).toHaveLength(3);
  });

  it("a reset link also confirms the email", async () => {
    await signup(db, "1.1.1.1", { ...form, email: "new@example.com", username: "newbie" });
    sent.length = 0;
    await forgotPassword(db, "1.1.1.1", { email: "new@example.com" });
    const res = await resetPassword(db, "1.1.1.1", { token: resetToken(sent[0]!), password: "brand new pass", retypePassword: "brand new pass" });
    expect(res.status).toBe(200);
    expect((await login(db, "1.1.1.1", { username: "newbie", password: "brand new pass" })).status).toBe(200);
  });

  it("only the newest link works", async () => {
    await forgotPassword(db, "1.1.1.1", { email: form.email });
    await forgotPassword(db, "1.1.1.1", { email: form.email });
    const [first, second] = sent.map(resetToken);
    expect((await resetPassword(db, "1.1.1.1", { token: first, password: "brand new pass", retypePassword: "brand new pass" })).status).toBe(400);
    expect((await resetPassword(db, "1.1.1.1", { token: second, password: "brand new pass", retypePassword: "brand new pass" })).status).toBe(200);
  });
});

describe("account settings", () => {
  let session: string;
  beforeEach(async () => {
    session = (await signedUp("9.9.9.9")).session!;
  });
  const loginAs = (password: string) => login(db, "1.1.1.1", { username: "tomato_fan", password });

  it("changes the password with the current one, logging out other devices only", async () => {
    const other = (await loginAs(form.password)).session!;
    const wrong = await changePassword(db, session, { currentPassword: "nope nope", password: "fresh password", retypePassword: "fresh password" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.fields).toHaveProperty("currentPassword");

    const ok = await changePassword(db, session, { currentPassword: form.password, password: "fresh password", retypePassword: "fresh password" });
    expect(ok.status).toBe(200);
    expect(await currentUser(db, session)).not.toBeNull();
    expect(await currentUser(db, other)).toBeNull();
    expect((await loginAs("fresh password")).status).toBe(200);
    expect((await changePassword(db, "made-up", { currentPassword: "x", password: "fresh password", retypePassword: "fresh password" })).status).toBe(401);
  });

  it("limits guesses at the current password", async () => {
    for (let i = 0; i < 5; i++) await deleteAccount(db, session, { currentPassword: "guess " + i });
    expect((await deleteAccount(db, session, { currentPassword: form.password })).status).toBe(429);
  });

  it("logs out other devices", async () => {
    const other = (await loginAs(form.password)).session!;
    const res = await logoutOthers(db, session);
    expect(res.body.message).toContain("1 other device");
    expect(await currentUser(db, other)).toBeNull();
    expect(await currentUser(db, session)).not.toBeNull();
  });

  it("deletes the account and everything in it, with the password", async () => {
    await db.query("INSERT INTO user_data (user_id, key, value) SELECT id, 'todos', '[]' FROM users");
    expect((await deleteAccount(db, session, { currentPassword: "nope nope" })).status).toBe(400);
    const res = await deleteAccount(db, session, { currentPassword: form.password });
    expect(res.status).toBe(200);
    expect(res.session).toBe("");
    for (const table of ["users", "sessions", "user_data"]) {
      expect((await db.query(`SELECT 1 FROM ${table}`)).rows).toHaveLength(0);
    }
    expect((await loginAs(form.password)).status).toBe(401);
  });
});

describe("leaked passwords", () => {
  it("are refused when signing up, resetting and changing the password", async () => {
    const res = await signup(db, "1.1.1.1", { ...form, password: "password123", retypePassword: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty("password");
    expect(await userCount()).toBe(0);

    const { session } = await signedUp("1.1.1.1");
    const change = await changePassword(db, session, { currentPassword: form.password, password: "password123", retypePassword: "password123" });
    expect(change.body.fields).toHaveProperty("password");

    sent.length = 0;
    await forgotPassword(db, "1.1.1.1", { email: form.email });
    const token = linkToken(sent[0]!, "reset");
    const reset = await resetPassword(db, "1.1.1.1", { token, password: "password123", retypePassword: "password123" });
    expect(reset.body.fields).toHaveProperty("password");
  });

  it("an email that already has an account gets the same answer", async () => {
    await signedUp("1.1.1.1");
    const fresh = await signup(db, "2.2.2.2", { ...form, email: "new@x.com", username: "new1", password: "password123", retypePassword: "password123" });
    const taken = await signup(db, "3.3.3.3", { ...form, username: "new2", password: "password123", retypePassword: "password123" });
    expect(taken).toEqual(fresh);
  });

  it("are allowed if the check fails", async () => {
    setBreachCheck(async () => {
      throw new Error("offline");
    });
    expect((await signup(db, "1.1.1.1", form)).status).toBe(202);
  });
});
