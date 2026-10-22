import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors());
app.use(express.json());

// User-uploaded images (custom foods, timer images).
app.use("/uploads", express.static(path.join(here, "../uploads")));

app.use("/api/health", healthRouter);

app.listen(PORT, () => {
  console.log(`TomoNook server on http://localhost:${PORT}`);
});
