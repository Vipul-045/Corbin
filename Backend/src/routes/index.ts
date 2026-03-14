// src/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Application boot: load env → validate → start Express.
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { createServer } from "../server";

// ── Guard: require API key before doing anything ──────────────────────────────
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "\n❌  OPENAI_API_KEY is not set.\n" +
    "    Copy .env.example → .env and fill in your key.\n"
  );
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const app  = createServer();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       Router-Based Multi-Agent System  ·  TypeScript          ║
╠═══════════════════════════════════════════════════════════════╣
║  Base URL  →  http://localhost:${PORT}                           ║
║                                                               ║
║  Endpoints                                                    ║
║  ─────────────────────────────────────────────────────────── ║
║  POST  /chat            ← main entry (auto-routed)           ║
║  POST  /agent/:key      ← direct specialist access           ║
║  GET   /agents          ← list router + all specialists      ║
║  GET   /health          ← health check                       ║
║                                                               ║
║  Specialists                                                  ║
║  coder · researcher · writer · analyst · planner · support   ║
╚═══════════════════════════════════════════════════════════════╝
`);
});
