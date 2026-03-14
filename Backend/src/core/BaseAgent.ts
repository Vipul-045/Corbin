// src/core/BaseAgent.ts

import axios from "axios";
import type { Message, ChatResult, AgentDescriptor } from "../types";

export interface BaseAgentOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export abstract class BaseAgent {
  public readonly name: string;
  public readonly model: string;

  protected readonly systemPrompt: string;
  protected readonly maxTokens: number;
  protected readonly temperature: number;

  private readonly apiKey: string;
  private readonly baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor(
    name: string,
    systemPrompt: string,
    options: BaseAgentOptions = {},
  ) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.model =
      options.model ?? process.env.TOGETHER_MODEL ?? "deepseek-ai/DeepSeek-V3";
    this.maxTokens = options.maxTokens ?? 1024;
    this.temperature = options.temperature ?? 0.7;
    this.apiKey = process.env.TOGETHER_API_KEY ?? "";
  }

  // ── Non-streaming chat (used internally for routing + agent replies) ────────
  async chat(userMessage: string, history: Message[] = []): Promise<string> {
    const messages: Message[] = [
      { role: "system", content: this.systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ];

    const response = await axios.post(
      this.baseUrl,
      {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content)
      throw new Error(`${this.name}: Together AI returned empty content.`);
    return content;
  }

  // ── Streaming chat — yields text chunks via AsyncGenerator ─────────────────
  async *chatStream(
    userMessage: string,
    history: Message[] = [],
  ): AsyncGenerator<string> {
    const messages: Message[] = [
      { role: "system", content: this.systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ];

    const response = await axios.post(
      this.baseUrl,
      {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: true,
        context_length_exceeded_behavior: "truncate",
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        responseType: "stream",
      },
    );

    // Parse SSE chunks
    for await (const chunk of response.data) {
      const lines = chunk
        .toString()
        .split("\n")
        .filter((l: string) => l.trim());
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  // ── chatWithHistory — used by the Router after routing decision ────────────
  async chatWithHistory(
    userMessage: string,
    history: Message[] = [],
  ): Promise<ChatResult> {
    const reply = await this.chat(userMessage, history);
    return {
      reply,
      history: [
        ...history,
        { role: "user", content: userMessage },
        { role: "assistant", content: reply },
      ],
    };
  }

  describe(): AgentDescriptor {
    return { key: this.name.toLowerCase(), name: this.name, model: this.model };
  }
}
