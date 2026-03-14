// src/server.ts
// ─────────────────────────────────────────────────────────────────────────────
// Express app factory — kept separate from index.ts so the app
// can be imported in tests without binding a port.
// ─────────────────────────────────────────────────────────────────────────────

import express, { type Express } from "express";
import { errorHandler, requestLogger } from "./middleware/logger";
import { buildAgentSystem } from "./core/AgentRegistry";
import { buildRoutes } from ".";

export function createServer(): Express {
  const app = express();

  // ── Middleware ─────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(requestLogger);

  // ── Boot agent system ─────────────────────────────────────────────────────
  const { router, agents } = buildAgentSystem();

  // ── Mount routes ──────────────────────────────────────────────────────────
  app.use("/", buildRoutes(router, agents));

  // ── Error handler (must be last) ──────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
