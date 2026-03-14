// src/core/RouterAgent.ts
// ─────────────────────────────────────────────────────────────────────────────
// THE ENTRY POINT FOR EVERY PROMPT.
//
// Reads the incoming prompt → uses Together AI function-calling to produce a
// typed routing decision → forwards the task to the chosen specialist.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import {
  AGENT_KEYS,
  type AgentKey,
  type AgentDescriptor,
  type Message,
  type RoutingDecision,
  type RouterResult,
} from "../types";
import { BaseAgent } from "./BaseAgent";


type FunctionDefinition = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};
// ── Router system instruction ─────────────────────────────────────────────────
const ROUTER_SYSTEM = `
You are a Router — an intelligent dispatcher in a multi-agent AI system.

Your ONLY job is to read the user's request and decide which ONE specialist
agent should handle it. You must call the route_to_agent function with your
decision. Never attempt to answer the question yourself.

Routing guidelines:
- coder      → coding, debugging, scripts, algorithms, technical implementations
- researcher → research, facts, topic summaries, comparisons, explanations
- writer     → drafting text, emails, essays, creative writing, editing, copy
- analyst    → data analysis, math, statistics, logic puzzles, structured reasoning
- planner    → project plans, task breakdowns, timelines, checklists, strategies
- support    → customer support replies, complaint handling, refund/policy questions
- translator → translate text between languages, localisation
When in doubt, pick the agent whose domain most closely overlaps the request.
`.trim();

// ── Function definition for structured routing ────────────────────────────────
// inline type — no openai package needed


const ROUTE_FUNCTION: FunctionDefinition = {
  name: "route_to_agent",
  description: "Pick the single best specialist agent for this task.",
  parameters: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        enum: [...AGENT_KEYS],
        description: "The agent that should handle the request.",
      },
      reason: {
        type: "string",
        description: "One sentence: why this agent was chosen.",
      },
      rewritten_task: {
        type: "string",
        description:
          "Optionally rewrite/clarify the user task before forwarding. " +
          "Leave identical to the original if no rewrite is needed.",
      },
    },
    required: ["agent", "reason", "rewritten_task"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export class RouterAgent {
  public readonly name  = "Router";
  public readonly model: string;

  private readonly apiKey:   string;
private readonly baseUrl = "https://api.groq.com/openai/v1/chat/completions";
  private readonly registry = new Map<AgentKey, BaseAgent>();

  constructor() {
    this.model  = process.env.TOGETHER_MODEL  ?? "deepseek-ai/DeepSeek-V3";
    this.apiKey = process.env.TOGETHER_API_KEY ?? "";
  }

  // ── Registry ───────────────────────────────────────────────────────────────

  register(key: AgentKey, agent: BaseAgent): void {
    // console.log("register");
    this.registry.set(key, agent);
    console.log(`[Router] Registered agent: ${key} → ${agent.name}`);
  }

  listAgents(): AgentDescriptor[] {
    return [...this.registry.entries()].map(([key, agent]) => ({
      key,
      name:  agent.name,
      model: agent.model,
    }));
  }

  // ── Main entry point ───────────────────────────────────────────────────────

  async run(userPrompt: string, history: Message[] = []): Promise<RouterResult> {
    console.log(`\n[Router] <- Incoming: "${userPrompt.slice(0, 80)}..."`);

    // Step 1 — routing decision via function-calling
    const decision = await this.decide(userPrompt);
    const { agent: agentKey, reason, rewritten_task } = decision;

    console.log(`[Router] -> Routing to: "${agentKey}" | ${reason}`);

    // Step 2 — look up the specialist
    const specialist = this.registry.get(agentKey);
    if (!specialist) {
      throw new Error(
        `Router chose unknown agent "${agentKey}". ` +
        `Registered: [${[...this.registry.keys()].join(", ")}]`
      );
    }

    // Step 3 — forward to specialist and measure latency
    const taskToForward = rewritten_task || userPrompt;
    console.log(`[Router] -> Forwarding to ${specialist.name}`);

    const t0 = Date.now();
    const { reply, history: updatedHistory } = await specialist.chatWithHistory(
      taskToForward,
      history
    );
    const durationMs = Date.now() - t0;

    console.log(`[Router] <- ${specialist.name} responded in ${durationMs}ms`);

    return {
      originalPrompt: userPrompt,
      routing: {
        agentKey,
        agentName:     specialist.name,
        reason,
        rewrittenTask: taskToForward,
      },
      reply,
      history:         updatedHistory,
      meta: { durationMs, model: specialist.model },
    };
  }

  // ── Private: Together AI function-calling for routing ─────────────────────

private async decide(userPrompt: string): Promise<RoutingDecision> {
  const response = await axios.post(
    this.baseUrl,
    {
      model:       this.model,
      temperature: 0,
      max_tokens:  256,
      messages: [
        { role: "system", content: ROUTER_SYSTEM },
        { role: "user",   content: userPrompt },
      ],
      tools: [{ type: "function", function: ROUTE_FUNCTION }],
      tool_choice: { type: "function", function: { name: "route_to_agent" } },
    },
    {
      headers: {
        Authorization:  `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
    }
  );

  const toolCall = response.data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("Router: no tool_call returned by Groq.");
  }

  return JSON.parse(toolCall.function.arguments) as RoutingDecision;
}
}