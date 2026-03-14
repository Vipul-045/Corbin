import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type {
  ChatRequest,
  ChatResponse,
  PremiumChatResponse,
  SearchRequest,
  SearchResponse,
  HealthResponse,
  X402Request,
} from '../types/index';
import { config } from '../config/index';
// ✅ CORRECT — import from x402-express and use base-sepolia
import { paymentMiddleware, facilitatorUrl, network } from 'x402-express';

const app = express();

app.use(cors());
app.use(express.json());

// ─── X402 Payment Middleware ───────────────────────────────────────────────
// Gates all routes below behind on-chain USDC micropayments on Base.
// When a client hits /chat without paying, server returns HTTP 402.
// x402-axios on the client side intercepts, pays, and retries automatically.

app.use(
  paymentMiddleware(
    config.ownerWallet,
    {
      '/chat': {
        price:   config.pricing.chat,
        network: 'base-sepolia',        // ← sepolia
        config:  { description: 'Pay-per-message AI chat · Elsa X402' },
      },
      '/chat/premium': {
        price:   config.pricing.premium,
        network: 'base-sepolia',        // ← sepolia
        config:  { description: 'Premium AI chat · extended context · Elsa X402' },
      },
      '/api/search': {
        price:   config.pricing.search,
        network: 'base-sepolia',        // ← sepolia
        config:  { description: 'Token search · Elsa X402' },
      },
    },
    { url: facilitatorUrl, network: 'base-sepolia' }  // ← sepolia here too
  )
);

// ─── Helpers ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Replace this with a real AI provider (Anthropic, OpenAI, etc.)
async function generateAIResponse(message: string, premium: boolean): Promise<string> {
  await delay(150);
  if (premium) {
    return (
      `[PREMIUM RESPONSE]\n\n` +
      `Your question: "${message}"\n\n` +
      `This is a premium response with extended context and richer analysis, ` +
      `powered by Elsa X402 micropayments on Base network. ` +
      `Your $${config.pricing.premium.replace('$','')} USDC payment was received by the owner.`
    );
  }
  return (
    `Your question: "${message}"\n\n` +
    `This response was paid for via X402 micropayment ($${config.pricing.chat}) ` +
    `on Base network. Payment received by owner wallet.`
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────

// Free health check — no payment required
app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status:  'healthy',
    service: 'Elsa X402 Chat Server',
    version: '1.0.0',
    owner:   config.ownerWallet,
    pricing: {
      chat:    config.pricing.chat,
      premium: config.pricing.premium,
    },
    payment: {
      protocol:  'X402',
      network:   config.network,
      token:     'USDC',
      recipient: config.ownerWallet,
    },
  });
});

// POST /chat — $0.001 per message
app.post('/chat', async (req: X402Request, res: Response<ChatResponse>, next: NextFunction) => {
  try {
    const { message, user_address } = req.body as ChatRequest;

    if (!message?.trim()) {
      res.status(400).json({
        success: false,
        response: '',
        meta: { model: '', charged: '', paid_to: '', tx_ref: '', timestamp: '' },
      });
      return;
    }

    console.log(
      `[CHAT]    user=${user_address ?? 'anon'} | ` +
      `paid=${config.pricing.chat} | msg="${message.slice(0, 50)}"`
    );

    const response = await generateAIResponse(message, false);

    const result: ChatResponse = {
      success: true,
      response,
      meta: {
        model:     'elsa-chat-v1',
        charged:   config.pricing.chat,
        paid_to:   config.ownerWallet,
        tx_ref:    req.payment?.txHash ?? 'x402-confirmed',
        timestamp: new Date().toISOString(),
      },
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /chat/premium — $0.005 per message
app.post('/chat/premium', async (req: X402Request, res: Response<PremiumChatResponse>, next: NextFunction) => {
  try {
    const { message, user_address, context } = req.body as ChatRequest;

    if (!message?.trim()) {
      res.status(400).json({
        success: false,
        response: '',
        context_tokens: 0,
        meta: { model: '', charged: '', paid_to: '', tx_ref: '', timestamp: '' },
      });
      return;
    }

    console.log(
      `[PREMIUM] user=${user_address ?? 'anon'} | ` +
      `paid=${config.pricing.premium} | msg="${message.slice(0, 50)}"`
    );

    const response = await generateAIResponse(message, true);

    const result: PremiumChatResponse = {
      success: true,
      response,
      context_tokens: context?.length ?? 0,
      meta: {
        model:     'elsa-premium-v1',
        charged:   config.pricing.premium,
        paid_to:   config.ownerWallet,
        tx_ref:    req.payment?.txHash ?? 'x402-confirmed',
        timestamp: new Date().toISOString(),
      },
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/search — $0.0005
app.post('/api/search', async (req: Request<{}, SearchResponse, SearchRequest>, res: Response<SearchResponse>, next: NextFunction) => {
  try {
    const { query } = req.body;

    const result: SearchResponse = {
      success: true,
      results: [
        { symbol: query?.toUpperCase() ?? 'USDC', name: 'USD Coin',    price: '$1.00',    chain: 'base' },
        { symbol: 'ETH',                           name: 'Ethereum',    price: '$3,420.00', chain: 'base' },
        { symbol: 'WETH',                          name: 'Wrapped ETH', price: '$3,419.80', chain: 'base' },
      ],
      charged: config.pricing.search,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Global error handler ─────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message } as any);
});

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   Elsa X402 Chat Server  (TypeScript)                ║
║   Port    : ${config.port}                                      ║
║   Owner   : ${config.ownerWallet.slice(0, 20)}...        ║
║   /chat          → ${config.pricing.chat} per message (USDC)     ║
║   /chat/premium  → ${config.pricing.premium} per message              ║
║   /api/search    → ${config.pricing.search} per search             ║
║   Network : ${config.network}                          ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;
