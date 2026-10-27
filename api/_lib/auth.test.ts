import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { currentUser, login, logout, me, signup } from "./auth";
import { database, setDb, type Db } from "./db";

let db: Db;

beforeEach(async () => {
  const pg = new PGlite();
  setDb({ query: (text, params) => pg.query(text, params) as never });
  db = await database();
});

const form = {
  email: "Tomato@Example.com",
  username: "tomato_fan",
  password: "ripe and juicy",
  retypePassword: "ripe and juicy",
  acceptTerms: true,
};

describe("signup", () => {
  it("creates an account and a session, storing only hashes", async () => {
    const res = await signup(db, "1.1.1.1", form);
    expect(res.status).toBe(201);
    expect(res.session).toMatch(/^[\w-]{43}$/);
    const { rows } = await db.query<{ email: string; password_hash: string }>("SELECT * FROM users");
    expect(rows[0]!.email).toBe("tomato@example.com");
    expect(rows[0]!.password_hash).toMatch(/^\$argon2id\$/);
    const sessions = await db.query<{ token_hash: string }>("SELECT token_hash FROM sessions");
    expect(sessions.rows[0]!.token_hash).not.toBe(res.session);
    expect(await currentUser(db, res.session)).toMatchObject({ username: "tomato_fan" });
  });

  it("requires the terms, matching passwords and a valid email", async () => {
    const res = await signup(db, "1.1.1.1", { ...form, email: "nope", retypePassword: "x", acceptTerms: false });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields as object).sort()).toEqual(["acceptTerms", "email", "retypePassword"]);
  });

  it("rejects a taken username, whatever its case", async () => {
    await signup(db, "1.1.1.1", form);
    const res = await signup(db, "1.1.1.1", { ...form, email: "other@example.com", username: "TOMATO_FAN" });
    expect(res.status).toBe(409);
    expect(res.body.fields).toHaveProperty("username");
  });

  it("treats SQL in the input as plain text", async () => {
    const res = await signup(db, "1.1.1.1", { ...form, username: "x'; DROP TABLE users;--" });
    expect(res.status).toBe(400);
    const res2 = await login(db, "1.1.1.1", { username: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res2.status).toBe(401);
    expect((await db.query("SELECT 1 FROM users")).rows).toBeDefined();
  });

  it("limits sign-ups from one IP", async () => {
    for (let i = 0; i < 5; i++) await signup(db, "2.2.2.2", { ...form, email: `a${i}@x.com`, username: `user${i}` });
    const res = await signup(db, "2.2.2.2", { ...form, email: "late@x.com", username: "late" });
    expect(res.status).toBe(429);
  });
});

describe("login", () => {
  beforeEach(async () => {
    await signup(db, "9.9.9.9", form);
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
});

describe("sessions", () => {
  it("logout ends the session and clears the cookie", async () => {
    const { session } = await signup(db, "1.1.1.1", form);
    expect((await me(db, session)).status).toBe(200);
    const out = await logout(db, session);
    expect(out.session).toBe("");
    expect((await me(db, session)).status).toBe(401);
  });

  it("rejects made-up and expired tokens", async () => {
    expect((await me(db, "made-up")).status).toBe(401);
    const { session } = await signup(db, "1.1.1.1", form);
    await db.query("UPDATE sessions SET expires_at = now() - interval '1 minute'");
    expect(await currentUser(db, session)).toBeNull();
  });
});
