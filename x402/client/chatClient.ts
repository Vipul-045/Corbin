import { withPaymentInterceptor } from 'x402-axios';
import axios, { AxiosInstance } from 'axios';
import { createWalletClient, http, WalletClient,publicActions  } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, Account } from 'viem/accounts';
import type {
  ChatResponse,
  PremiumChatResponse,
  SearchResponse,
  HealthResponse,
} from '../types/index';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ChatClientOptions {
  privateKey: `0x${string}`;
  baseUrl?: string;
  rpcUrl?: string;
}

export interface ChatClient {
  walletAddress: string;
  chat(message: string): Promise<ChatResponse>;
  chatPremium(message: string, context?: string[]): Promise<PremiumChatResponse>;
  searchToken(query: string): Promise<SearchResponse>;
  health(): Promise<HealthResponse>;
}

// ─── Factory ─────────────────────────────────────────────────────────────

/**
 * createChatClient
 * Returns a typed client that auto-pays via X402 on every request.
 *
 * @param options.privateKey  - User's wallet private key (0x...)
 * @param options.baseUrl     - Chat server URL (default: http://localhost:3000)
 * @param options.rpcUrl      - Base RPC URL (default: mainnet.base.org)
 */
export function createChatClient(options: ChatClientOptions): ChatClient {
  const {
    privateKey,
    baseUrl = 'http://localhost:3000',
    rpcUrl  = 'https://sepolia.base.org',
  } = options;

  // 1. Build viem wallet from private key
  const account: Account = privateKeyToAccount(privateKey);

  const walletClient: any = createWalletClient({
    account,
    chain:baseSepolia,
    transport: http(rpcUrl),
  }).extend(publicActions);

  console.log(`[X402 Client] Wallet  : ${account.address}`);
  console.log(`[X402 Client] Server  : ${baseUrl}`);
  console.log(`[X402 Client] Network : Base (USDC payments)`);

  // 2. Wrap axios — intercepts HTTP 402, pays on-chain, retries
  const http402: AxiosInstance = withPaymentInterceptor(
    axios.create({ baseURL: baseUrl }),
    walletClient
  );

  // 3. Return typed client
  return {
    walletAddress: account.address,

    /**
     * Send a standard chat message.
     * Auto-pays $0.001 USDC to owner on Base per call.
     */
    async chat(message: string): Promise<ChatResponse> {
      const res = await http402.post<ChatResponse>('/chat', {
        message,
        user_address: account.address,
      });
      return res.data;
    },

    /**
     * Send a premium chat message.
     * Auto-pays $0.005 USDC to owner on Base per call.
     */
    async chatPremium(message: string, context: string[] = []): Promise<PremiumChatResponse> {
      const res = await http402.post<PremiumChatResponse>('/chat/premium', {
        message,
        user_address: account.address,
        context,
      });
      return res.data;
    },

    /**
     * Search for a token.
     * Auto-pays $0.0005 USDC per call.
     */
    async searchToken(query: string): Promise<SearchResponse> {
      const res = await http402.post<SearchResponse>('/api/search', { query });
      return res.data;
    },

    /**
     * Health check — free, no payment.
     */
    async health(): Promise<HealthResponse> {
      const res = await axios.get<HealthResponse>(`${baseUrl}/health`);
      return res.data;
    },
  };
}
