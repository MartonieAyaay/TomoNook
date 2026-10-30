import type { IncomingMessage, ServerResponse } from "node:http";
import {
  SESSION_DAYS,
  currentUser,
  forgotPassword,
  login,
  logout,
  me,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
  type Result,
} from "./auth";
import { getData, putData } from "./data";
import { DatabaseNotSetUp, database } from "./db";

/*
  Turns an HTTP request into a call to auth.ts. Used by the Vercel
  function (api/auth/[action].ts) and by the local Express server, so both
  behave the same.
*/

export const SESSION_COOKIE = "tn_session";
const MAX_BODY_CHARS = 10_000;
/** App data can hold pictures and an alarm sound; Vercel takes up to 4.5 MB per request. */
const MAX_DATA_BODY_CHARS = 3_500_000;

type Req = IncomingMessage & { body?: unknown };

function cookie(req: Req, name: string) {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** The visitor's IP: Vercel's proxy puts it first in x-forwarded-for. */
function clientIp(req: Req) {
  const forwarded = process.env.VERCEL ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() : "";
  return forwarded || req.socket.remoteAddress || "unknown";
}

/*
  Blocks other websites from sending requests with the user's cookie (CSRF):
  the browser always sends Origin on these POSTs, and it must be this site.
  SameSite=Lax on the cookie is the second layer.
*/
function sameOrigin(req: Req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function readBody(req: Req, maxChars = MAX_BODY_CHARS): unknown {
  const body = typeof req.body === "string" ? safeJson(req.body) : req.body;
  return JSON.stringify(body ?? {}).length > maxChars ? null : body;
}

/** Same-site JSON POSTs only (see sameOrigin). Returns the reason to refuse, if any. */
function refusePost(req: Req): Result | null {
  if (!sameOrigin(req)) return fail(403, "This request came from another site.");
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) return fail(415, "Send JSON.");
  return null;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function send(res: ServerResponse, result: Result) {
  res.statusCode = result.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Account details must never be cached by the browser or a CDN.
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (result.retryAfterSeconds) res.setHeader("Retry-After", String(result.retryAfterSeconds));
  if (result.session !== undefined) {
    const maxAge = result.session ? SESSION_DAYS * 24 * 60 * 60 : 0;
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=${result.session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
    );
  }
  res.end(JSON.stringify(result.body));
}

const fail = (status: number, error: string): Result => ({ status, body: { error } });

const ACTIONS = ["me", "login", "signup", "logout", "forgot", "reset", "verify", "resend"];

export async function handleAuth(action: string, req: Req, res: ServerResponse) {
  try {
    const method = action === "me" ? "GET" : "POST";
    if (!ACTIONS.includes(action)) return send(res, fail(404, "Not found."));
    if (req.method !== method) {
      res.setHeader("Allow", method);
      return send(res, fail(405, "Method not allowed."));
    }
    const refused = method === "POST" && refusePost(req);
    if (refused) return send(res, refused);

    const db = await database();
    const token = cookie(req, SESSION_COOKIE);
    const body = readBody(req);
    if (method === "POST" && body === null) return send(res, fail(400, "That request couldn’t be read."));

    if (action === "me") return send(res, await me(db, token));
    if (action === "logout") return send(res, await logout(db, token));
    if (action === "login") return send(res, await login(db, clientIp(req), body));
    if (action === "forgot") return send(res, await forgotPassword(db, clientIp(req), body));
    if (action === "reset") return send(res, await resetPassword(db, clientIp(req), body));
    if (action === "verify") return send(res, await verifyEmail(db, clientIp(req), body));
    if (action === "resend") return send(res, await resendVerification(db, clientIp(req), body));
    return send(res, await signup(db, clientIp(req), body));
  } catch (e) {
    serverError(res, e);
  }
}

/** /api/data: GET the signed-in account's app data, POST changes to it (see data.ts). */
export async function handleData(req: Req, res: ServerResponse) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, fail(405, "Method not allowed."));
    }
    const refused = req.method === "POST" && refusePost(req);
    if (refused) return send(res, refused);

    const db = await database();
    const user = await currentUser(db, cookie(req, SESSION_COOKIE));
    if (req.method === "GET") return send(res, await getData(db, user));
    const body = readBody(req, MAX_DATA_BODY_CHARS);
    if (body === null) return send(res, fail(413, "That’s too much to save at once."));
    return send(res, await putData(db, user, body));
  } catch (e) {
    serverError(res, e);
  }
}

function serverError(res: ServerResponse, e: unknown) {
  // Details stay in the server log; the browser gets a plain message.
  console.error("API error:", e);
  if (e instanceof DatabaseNotSetUp) {
    return send(res, fail(503, "Accounts aren’t available right now: TomoNook’s database isn’t connected yet."));
  }
  send(res, fail(500, "Something went wrong on our side. Please try again."));
}
