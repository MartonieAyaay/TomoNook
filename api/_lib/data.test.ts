import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import type { User } from "./auth";
import { DATA_LIMITS, getData, putData } from "./data";
import { database, setDb, type Db } from "./db";

let db: Db;
let alice: User;
let bob: User;

async function addUser(username: string): Promise<User> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (email, username, username_key, password_hash, terms_version, terms_accepted_at)
     VALUES ($1, $2, $2, 'x', 'v', now()) RETURNING id`,
    [`${username}@example.com`, username],
  );
  return { id: rows[0]!.id, username, email: `${username}@example.com` };
}

beforeEach(async () => {
  const pg = new PGlite();
  setDb({ query: (text, params) => pg.query(text, params) as never });
  db = await database();
  alice = await addUser("alice");
  bob = await addUser("bob");
});

const dataOf = async (user: User) => (await getData(db, user)).body.data;

describe("app data", () => {
  it("needs a signed-in account", async () => {
    expect((await getData(db, null)).status).toBe(401);
    expect((await putData(db, null, { set: { todos: "[]" } })).status).toBe(401);
  });

  it("saves, updates and removes keys, separately for each account", async () => {
    await putData(db, alice, { set: { todos: "[1]", name: '"Alice"' } });
    await putData(db, alice, { set: { todos: "[1,2]" }, remove: ["name"] });
    await putData(db, bob, { set: { todos: "[9]" } });
    expect(await dataOf(alice)).toEqual({ todos: "[1,2]" });
    expect(await dataOf(bob)).toEqual({ todos: "[9]" });
  });

  it("replace drops every key that isn't sent", async () => {
    await putData(db, alice, { set: { todos: "[1]", moods: "[]" } });
    await putData(db, alice, { set: { name: '"A"' }, replace: true });
    expect(await dataOf(alice)).toEqual({ name: '"A"' });
    await putData(db, alice, { replace: true });
    expect(await dataOf(alice)).toEqual({});
  });

  it("rejects odd keys and oversized data", async () => {
    expect((await putData(db, alice, { set: { "../x": "1" } })).status).toBe(400);
    expect((await putData(db, alice, { set: { a: 1 } })).status).toBe(400);
    expect((await putData(db, alice, { set: { a: "x".repeat(DATA_LIMITS.valueChars + 1) } })).status).toBe(400);
    const big = "x".repeat(DATA_LIMITS.valueChars);
    await putData(db, alice, { set: { a: big, b: big, c: big } });
    expect((await putData(db, alice, { set: { d: big } })).status).toBe(413);
    // Replacing a value counts its new size, not both.
    expect((await putData(db, alice, { set: { a: big } })).status).toBe(200);
  });

  it("is deleted with the account", async () => {
    await putData(db, alice, { set: { todos: "[1]" } });
    await db.query("DELETE FROM users WHERE id = $1", [alice.id]);
    expect((await db.query("SELECT 1 FROM user_data")).rows).toHaveLength(0);
  });
});
