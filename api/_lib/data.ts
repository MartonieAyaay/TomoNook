import { z } from "zod";
import type { Result, User } from "./auth";
import type { Db } from "./db";

/*
  Each account's app data (tasks, moods, diary, avatar, settings...), so it
  follows the account to any device and isn't left behind for the next
  person on a shared computer.

  It's stored the way the app keeps it in the browser: one text value per
  key (e.g. "todos" → the tasks as JSON). The server doesn't read inside
  the values; it only checks their keys and sizes.
*/

export const DATA_LIMITS = {
  /** One value, e.g. the custom alarm sound (1 MB of audio is about 1.4 million characters). */
  valueChars: 2_500_000,
  /** Everything one account keeps. The browser itself holds about 5 MB. */
  totalChars: 8_000_000,
  keys: 200,
};

const key = z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/);

export const putSchema = z.object({
  /** Keys to save, with their new values. */
  set: z.record(key, z.string().max(DATA_LIMITS.valueChars)).default({}),
  /** Keys to delete. */
  remove: z.array(key).max(DATA_LIMITS.keys).default([]),
  /** Delete every key that isn't in `set` (restoring a backup, or starting over). */
  replace: z.boolean().default(false),
});

const signedOut: Result = { status: 401, body: { error: "Please log in again." } };

export async function getData(db: Db, user: User | null): Promise<Result> {
  if (!user) return signedOut;
  const { rows } = await db.query<{ key: string; value: string }>("SELECT key, value FROM user_data WHERE user_id = $1", [
    user.id,
  ]);
  return { status: 200, body: { data: Object.fromEntries(rows.map((r) => [r.key, r.value])) } };
}

export async function putData(db: Db, user: User | null, input: unknown): Promise<Result> {
  if (!user) return signedOut;
  const parsed = putSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "That data couldn’t be saved." } };
  const { set, remove, replace } = parsed.data;
  const setKeys = Object.keys(set);
  if (setKeys.length > DATA_LIMITS.keys) return { status: 400, body: { error: "That data couldn’t be saved." } };

  // What the account will hold afterwards, so one account can't fill the database.
  const { rows } = await db.query<{ key: string; size: number }>(
    "SELECT key, length(value)::int AS size FROM user_data WHERE user_id = $1",
    [user.id],
  );
  const sizes = new Map(replace ? [] : rows.map((r) => [r.key, r.size]));
  for (const k of remove) sizes.delete(k);
  for (const k of setKeys) sizes.set(k, set[k]!.length);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  if (sizes.size > DATA_LIMITS.keys || total > DATA_LIMITS.totalChars) {
    return { status: 413, body: { error: "Your TomoNook is full. Try removing some pictures or your alarm sound." } };
  }

  if (replace) {
    await db.query("DELETE FROM user_data WHERE user_id = $1 AND NOT (key = ANY($2::text[]))", [user.id, setKeys]);
  } else if (remove.length > 0) {
    await db.query("DELETE FROM user_data WHERE user_id = $1 AND key = ANY($2::text[])", [user.id, remove]);
  }
  for (const k of setKeys) {
    await db.query(
      `INSERT INTO user_data (user_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [user.id, k, set[k]],
    );
  }
  return { status: 200, body: { ok: true } };
}
