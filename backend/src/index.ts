/**
 * backend/src/index.ts
 * Express server entry point (TypeScript).
 * Full implementation happens on Day 5 — this is a placeholder for Day 1.
 */

import express from "express";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[backend] Server listening on port ${PORT}`);
});

export default app;
