// src/routes/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// All Express route handlers — fully typed request/response bodies.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { AgentKey, ChatRequestBody, DirectAgentRequestBody } from "./types";
import { RouterAgent } from "./core/RouterAgent";
import { BaseAgent } from "./core/BaseAgent";


import "dotenv/config";

console.log("KEY LOADED:", !!process.env.TOGETHER_API_KEY, process.env.TOGETHER_API_KEY?.slice(0, 6));
console.log("Step 1: importing server...");

import { createServer } from "./server";

console.log("Step 2: server imported");

const PORT = Number(process.env.PORT) || 3000;
const app  = createServer();

console.log("Step 3: createServer() done");

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
export function buildRoutes(
  router: RouterAgent,
  agents: Record<AgentKey, BaseAgent>,
): Router {
  const r = Router();

  // ── POST /chat ─────────────────────────────────────────────────────────────
  // THE main entry point. Every prompt passes through the Router first.
  //
  // Body:    { prompt: string; history?: Message[] }
  // Returns: routing decision + specialist reply + updated history + meta
  r.post(
    "/chat",
    async (
      req: Request<{}, {}, ChatRequestBody>,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const { prompt, history = [] } = req.body;

        if (!prompt?.trim()) {
          res.status(400).json({ error: "Missing or empty 'prompt'." });
          return;
        }

        const result = await router.run(prompt, history);
        console.log("Data",          {prompt: result.originalPrompt,
          routing: result.routing,
          reply: result.reply,
          history: result.history,
          meta: result.meta});
        res.json({
          prompt: result.originalPrompt,
          routing: result.routing,
          reply: result.reply,
          history: result.history,
          meta: result.meta,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── POST /agent/:key ───────────────────────────────────────────────────────
  // Bypass the Router — talk directly to a named specialist.
  //
  // Body:    { prompt: string; history?: Message[] }
  // Returns: agent info + reply + updated history
  r.post(
    "/agent/:key",
    async (
      req: Request<{ key: string }, {}, DirectAgentRequestBody>,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const key = req.params.key as AgentKey;
        const agent = agents[key];

        if (!agent) {
          res.status(404).json({
            error: `Agent "${key}" not found.`,
            available: Object.keys(agents),
          });
          return;
        }

        const { prompt, history = [] } = req.body;

        if (!prompt?.trim()) {
          res.status(400).json({ error: "Missing or empty 'prompt'." });
          return;
        }

        const { reply, history: updatedHistory } = await agent.chatWithHistory(
          prompt,
          history,
        );

        res.json({
          agent: { key, name: agent.name, model: agent.model },
          prompt,
          reply,
          history: updatedHistory,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── GET /agents ────────────────────────────────────────────────────────────
  r.get("/agents", (_req: Request, res: Response) => {
    res.json({
      router: {
        name: router.name,
        model: router.model,
        role: "Entry point — routes every /chat prompt to the best specialist",
      },
      specialists: router.listAgents(),
    });
  });

  // ── GET /health ────────────────────────────────────────────────────────────
  r.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // POST /chat/stream  — streams tokens back to the client in real-time
r.post("/chat/stream", async (req: Request<{}, {}, ChatRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { prompt, history = [] } = req.body;
    if (!prompt?.trim()) { res.status(400).json({ error: "Missing prompt." }); return; }

    // Route first (non-streaming), then stream the specialist's reply
    const decision  = await (router as any).decide(prompt);  // or expose decide() as protected
    const agent     = agents[decision.agent as AgentKey];
    if (!agent) { res.status(500).json({ error: "Unknown agent." }); return; }

    // Set SSE headers
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");

    // Send routing info first
    res.write(`data: ${JSON.stringify({ type: "routing", agent: decision.agent, reason: decision.reason })}\n\n`);

    // Stream tokens
    for await (const token of agent.chatStream(decision.rewritten_task || prompt, history)) {
      res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    next(err);
  }
});

  return r;
}


