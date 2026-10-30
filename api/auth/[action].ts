import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAuth } from "../_lib/http";

// Vercel function for /api/auth/<action> (me, login, signup, logout, ...; see ACTIONS in _lib/http.ts).
export default function handler(req: IncomingMessage & { query?: Record<string, string | string[]> }, res: ServerResponse) {
  const action = req.query?.action;
  return handleAuth(typeof action === "string" ? action : "", req, res);
}
