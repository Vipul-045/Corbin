// ─── Request / Response types ─────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  user_address?: string;
  context?: string[];
}

export interface ChatMeta {
  model: string;
  charged: string;
  paid_to: string;
  tx_ref: string;
  timestamp: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  meta: ChatMeta;
}

export interface PremiumChatResponse extends ChatResponse {
  context_tokens: number;
}

export interface SearchRequest {
  query: string;
}

export interface TokenResult {
  symbol: string;
  name: string;
  price: string;
  chain: string;
}

export interface SearchResponse {
  success: boolean;
  results: TokenResult[];
  charged: string;
}

// ─── Server config types ───────────────────────────────────────────────────

export interface RoutePaymentConfig {
  price: string;
  network: string;
  config?: {
    description?: string;
  };
}

export interface ServerConfig {
  port: number;
  ownerWallet: string;
  pricing: {
    chat: string;
    premium: string;
    search: string;
  };
  network: string;
}

// ─── Health check ─────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  owner: string;
  pricing: {
    chat: string;
    premium: string;
  };
  payment: {
    protocol: string;
    network: string;
    token: string;
    recipient: string;
  };
}

// ─── Demo / Client types ───────────────────────────────────────────────────

export interface TransactionReceipt {
  tx: number;
  message: string;
  charged?: string;
  paid_to?: string;
  timestamp?: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface DemoSummary {
  total_transactions: number;
  successful: number;
  failed: number;
  total_paid_usd: number;
  receipts: TransactionReceipt[];
}

// ─── Extended Express types ────────────────────────────────────────────────

import { Request } from 'express';

export interface X402PaymentInfo {
  txHash?: string;
  amount?: string;
  token?: string;
  payer?: string;
}

export interface X402Request extends Request {
  payment?: X402PaymentInfo;
  body: ChatRequest;
}
