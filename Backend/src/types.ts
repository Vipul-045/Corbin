// src/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared types used across the entire application.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Re-export for convenience so nothing else imports directly from OpenAI types
export type Message = ChatCompletionMessageParam;

// ── Agent keys ────────────────────────────────────────────────────────────────
export const AGENT_KEYS = [
  "coder",
  "researcher",
  "writer",
  "analyst",
  "planner",
  "support",
  "translator"
] as const;

export type AgentKey = (typeof AGENT_KEYS)[number];

// ── Router decision (parsed from OpenAI function-call) ────────────────────────
export interface RoutingDecision {
  agent: AgentKey;
  reason: string;
  rewritten_task: string;
}

// ── What router.run() returns ─────────────────────────────────────────────────
export interface RouterResult {
  originalPrompt: string;
  routing: {
    agentKey: AgentKey;
    agentName: string;
    reason: string;
    rewrittenTask: string;
  };
  reply: string;
  history: Message[];
  meta: {
    durationMs: number;
    model: string;
  };
}

// ── What agent.chatWithHistory() returns ──────────────────────────────────────
export interface ChatResult {
  reply: string;
  history: Message[];
}

// ── Agent descriptor (for /agents endpoint) ───────────────────────────────────
export interface AgentDescriptor {
  key: string;
  name: string;
  model: string;
}

// ── Express request bodies ────────────────────────────────────────────────────
export interface ChatRequestBody {
  prompt: string;
  history?: Message[];
}

export interface DirectAgentRequestBody {
  prompt: string;
  history?: Message[];
}
