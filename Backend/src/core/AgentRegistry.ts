// src/core/AgentRegistry.ts

import { BaseAgent } from "./BaseAgent";
import {
  CoderAgent,
  ResearcherAgent,
  WriterAgent,
  AnalystAgent,
  PlannerAgent,
  SupportAgent,
  TranslatorAgent,
} from "../agents/specialists";
import type { AgentKey } from "../types";
import { RouterAgent } from "./RouterAgent";

export interface AgentSystem {
  router: RouterAgent;
  agents: Record<AgentKey, BaseAgent>;
}

export function buildAgentSystem(): AgentSystem {
  const router = new RouterAgent();

  const agents: Record<AgentKey, BaseAgent> = {
    coder:      new CoderAgent(),
    researcher: new ResearcherAgent(),
    writer:     new WriterAgent(),
    analyst:    new AnalystAgent(),
    planner:    new PlannerAgent(),
    support:    new SupportAgent(),
    translator: new TranslatorAgent(),
  };

  (Object.entries(agents) as [AgentKey, BaseAgent][]).forEach(([key, agent]) => {
    router.register(key, agent);  // ✅ works now
  });

  return { router, agents };
}