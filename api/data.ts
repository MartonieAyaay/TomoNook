import type { IncomingMessage, ServerResponse } from "node:http";
import { handleData } from "./_lib/http";

// Vercel function for /api/data: the signed-in account's app data.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleData(req, res);
}
