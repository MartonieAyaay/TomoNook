import { Router } from "express";
import { today } from "@tomonook/shared";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ ok: true, today: today() });
});
