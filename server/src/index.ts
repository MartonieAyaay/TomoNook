import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { healthRouter } from "./routes/health.ts";
import { handleAuth } from "../../api/_lib/http.ts";
import { useDevDatabaseIfNeeded } from "./devDb.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

// Secrets (DATABASE_URL and friends) live in .env at the project root, never in code.
try {
  process.loadEnvFile(path.join(here, "../../.env"));
} catch {
  // No .env: fine for local development.
}
await useDevDatabaseIfNeeded();
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.disable("x-powered-by");
// The client reaches the API through Vite's proxy (same origin), so no CORS is needed.
app.use(express.json({ limit: "10kb" }));

// User-uploaded images (custom foods, timer images).
app.use("/uploads", express.static(path.join(here, "../uploads")));

app.use("/api/health", healthRouter);
// Same handler as the Vercel function in api/auth/[action].ts.
app.all("/api/auth/:action", (req, res) => handleAuth(req.params.action, req, res));

// Bad or oversized JSON: a short message, never a stack trace.
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 413 ? "That request is too big." : "That request couldn’t be read." });
});

app.listen(PORT, () => {
  console.log(`TomoNook server on http://localhost:${PORT}`);
});
