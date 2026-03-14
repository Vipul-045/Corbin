// src/middleware/logger.ts
// ─────────────────────────────────────────────────────────────────────────────
// Typed request logger and centralised error handler.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const ms    = Date.now() - start;
    const color =
      res.statusCode >= 500 ? "\x1b[31m" :  // red
      res.statusCode >= 400 ? "\x1b[33m" :  // yellow
      "\x1b[32m";                            // green
    console.log(
      `${color}[${res.statusCode}]\x1b[0m ${req.method} ${req.path} — ${ms}ms`
    );
  });

  next();
}

// Express error handler must have exactly 4 params for Express to recognise it
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message: string =
    err instanceof Error ? err.message : "Internal server error";
  console.error("[Error]", message);
  res.status(500).json({ error: true, message });
};
