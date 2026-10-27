import path from "node:path";
import { fileURLToPath } from "node:url";
import { setDb } from "../../api/_lib/db.ts";

/*
  Local development without a database server: when DATABASE_URL isn't set,
  accounts are kept in an embedded Postgres (PGlite) saved in server/data/.
  Production (Vercel) always uses the real PostgreSQL from DATABASE_URL.
*/
export async function useDevDatabaseIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const { PGlite } = await import("@electric-sql/pglite");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pg = new PGlite(path.join(here, "../data/pglite"));
  setDb({ query: (text, params) => pg.query(text, params) as never });
  console.log("No DATABASE_URL: using the local dev database in server/data/pglite");
}
