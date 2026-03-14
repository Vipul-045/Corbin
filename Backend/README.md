# Router-Based Multi-Agent System — TypeScript

A production-ready Express HTTP server where a **Router agent** is the
single entry point for every prompt. Built with TypeScript, OpenAI API,
and Express — fully typed end-to-end.

---

## Architecture

```
User Prompt
    │
    ▼
┌────────────────────────────────────────────────────────────┐
│                      ROUTER AGENT                          │
│                                                            │
│  Uses OpenAI function-calling → typed RoutingDecision:     │
│  { agent: AgentKey, reason: string, rewritten_task: string }│
└────┬──────────┬──────────┬──────────┬──────────┬──────────┘
     │          │          │          │          │
  coder   researcher   writer    analyst   planner   support
     │          │          │          │          │
  BaseAgent  BaseAgent  BaseAgent  BaseAgent  BaseAgent  BaseAgent
  (abstract class — OpenAI client + typed chat helpers)
```

---

## Project Structure

```
src/
├── index.ts                   # Entry point — validates env, starts Express
├── server.ts                  # Express app factory
├── types.ts                   # All shared interfaces and types
├── core/
│   ├── BaseAgent.ts           # Abstract base class for all agents
│   ├── RouterAgent.ts         # Router: function-calling dispatcher
│   └── AgentRegistry.ts       # Typed factory — wires everything together
├── agents/
│   └── specialists.ts         # 6 concrete agent classes
├── routes/
│   └── index.ts               # Typed Express route handlers
└── middleware/
    └── logger.ts              # Request logger + error handler
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Set OPENAI_API_KEY (and optionally OPENAI_MODEL, PORT)

# 3a. Development (hot-reload via ts-node-dev)
npm run dev

# 3b. Production build
npm run build && npm start

# Type-check without emitting
npm run typecheck
```

---

## API Reference

### `POST /chat` — Main entry point (Router-first)

Every prompt passes through the Router. Returns the routing decision,
the specialist's reply, and the updated conversation history.

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a TypeScript generic utility type that makes all nested keys optional"}'
```

**Response**
```jsonc
{
  "prompt": "Write a TypeScript generic utility type...",
  "routing": {
    "agentKey": "coder",
    "agentName": "Coder",
    "reason": "The request asks for a TypeScript code implementation.",
    "rewrittenTask": "Write a TypeScript generic utility type..."
  },
  "reply": "```typescript\ntype DeepPartial<T> = { ... }",
  "history": [
    { "role": "user",      "content": "Write a TypeScript..." },
    { "role": "assistant", "content": "```typescript\n..." }
  ],
  "meta": { "durationMs": 1540, "model": "gpt-4o" }
}
```

**Multi-turn conversation** — pass `history` back on each request:
```bash
# Turn 2
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Now add a unit test for it using Vitest",
    "history": [ ...history from turn 1... ]
  }'
```

---

### `POST /agent/:key` — Direct specialist (bypasses Router)

Available keys: `coder` | `researcher` | `writer` | `analyst` | `planner` | `support`

```bash
curl -X POST http://localhost:3000/agent/analyst \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is CAGR if revenue went from 1.2M to 4.8M over 5 years?"}'
```

---

### `GET /agents` — Introspect the system

```bash
curl http://localhost:3000/agents
```

---

### `GET /health`

```bash
curl http://localhost:3000/health
```

---

## Adding a New Specialist

**1.** Add the agent key to `src/types.ts`:
```ts
export const AGENT_KEYS = [
  "coder", "researcher", "writer", "analyst", "planner", "support",
  "translator",   // ← add here
] as const;
```

**2.** Create the class in `src/agents/specialists.ts`:
```ts
export class TranslatorAgent extends BaseAgent {
  constructor() {
    super(
      "Translator",
      `You are a professional translator. Translate text accurately,
preserving tone and nuance. Always state source and target language.`,
      { maxTokens: 2048, temperature: 0.3 }
    );
  }
}
```

**3.** Register it in `src/core/AgentRegistry.ts`:
```ts
agents: Record<AgentKey, BaseAgent> = {
  // ...existing
  translator: new TranslatorAgent(),
};
```

**4.** Add one routing guideline to `ROUTER_SYSTEM` in `src/core/RouterAgent.ts`:
```
- translator → translate text between languages, localisation
```

TypeScript will enforce the `AgentKey` type everywhere — if you miss a step
the compiler will tell you immediately.
