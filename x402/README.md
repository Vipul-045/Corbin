# Elsa X402 Chat — TypeScript Setup

Pay-per-message chat API. Every `POST /chat` automatically charges users
a USDC micropayment on Base. Payments go directly to your owner wallet.

---

## Project structure

```
elsa-x402-ts/
├── server/
│   └── index.ts          ← Express server with X402 middleware
├── client/
│   └── chatClient.ts     ← Typed client (auto-pays per request)
├── types/
│   └── index.ts          ← All shared TypeScript interfaces
├── config/
│   └── index.ts          ← Centralised config from .env
├── demo.ts               ← Demo transactions runner
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    → set OWNER_WALLET to YOUR wallet address
#    → set DEMO_PRIVATE_KEY to a test wallet with USDC on Base

# 3. Start server (Terminal 1)
npm run server

# 4. Run demo transactions (Terminal 2)
npm run demo
```

---

## Demo output

```
─────────────────────────────────────────────────────────
  Step 3 — Standard Chat Transactions  ($0.001 each)
─────────────────────────────────────────────────────────

[TX 1/5] "What is the current price of ETH?..."
  → Paying $0.001 USDC to owner on Base...
  ✓ Paid $0.001 → 0x0D224DB2830A32bc75...
  ✓ Response: "Your question: What is the current..."

[TX 2/5] "How does X402 micropayments work on Base?..."
  → Paying $0.001 USDC to owner on Base...
  ✓ Paid $0.001 → 0x0D224DB2830A32bc75...
  ...

─────────────────────────────────────────────────────────
  Transaction Receipt Summary
─────────────────────────────────────────────────────────

#    Message                                        Cost     Status
────────────────────────────────────────────────────────────────────────
1    What is the current price of ETH?             $0.001   ✓ paid
2    How does X402 micropayments work on Base?     $0.001   ✓ paid
3    Explain DeFi yield farming in simple terms    $0.001   ✓ paid
4    What are the top tokens on Base network?      $0.001   ✓ paid
5    How do I swap USDC to WETH using Elsa API?    $0.001   ✓ paid
6    Premium: Base DeFi analysis                   $0.005   ✓ paid
────────────────────────────────────────────────────────────────────────
Total paid   : $0.0100 USDC
Transactions : 6/6 successful
```

---

## API endpoints & pricing

| Endpoint        | Method | Price    | Description             |
|-----------------|--------|----------|-------------------------|
| `/health`       | GET    | FREE     | Server health check     |
| `/chat`         | POST   | $0.001   | Standard chat message   |
| `/chat/premium` | POST   | $0.005   | Premium/extended reply  |
| `/api/search`   | POST   | $0.0005  | Token search            |

---

## Use the client in your own TypeScript app

```typescript
import { createChatClient } from './client/chatClient.js';

const client = createChatClient({
  privateKey: '0xYourTestWalletPrivateKey',
  baseUrl:    'http://localhost:3000',
});

// Fully typed — auto-pays $0.001 USDC per call
const result = await client.chat('What is ETH price?');
console.log(result.response);
// meta.charged  → "$0.001"
// meta.paid_to  → "0x0D224DB..."
```

---

## Add real AI responses

In `server/index.ts`, replace `generateAIResponse()`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateAIResponse(message: string, premium: boolean): Promise<string> {
  const msg = await anthropic.messages.create({
    model:      premium ? 'claude-opus-4-6' : 'claude-haiku-4-5-20251001',
    max_tokens: premium ? 1024 : 256,
    messages:   [{ role: 'user', content: message }],
  });
  return (msg.content[0] as { text: string }).text;
}
```

Add `@anthropic-ai/sdk` to package.json dependencies.

---

## Change pricing

In `.env`:
```env
PRICE_CHAT=0.002       # $0.002 per standard message
PRICE_PREMIUM=0.010    # $0.010 per premium message
PRICE_SEARCH=0.001     # $0.001 per search
```

X402 supports sub-cent micropayments down to $0.0001.

---

## Getting USDC on Base (for the demo user wallet)

- Mainnet: https://bridge.base.org  (bridge from Ethereum)
- Testnet: https://faucet.circle.com  (free testnet USDC on Base Sepolia)
- Minimum needed: ~$0.10 USDC for hundreds of test messages

---

## Verify on-chain

After running the demo, check your owner wallet on BaseScan:
```
https://basescan.org/address/YOUR_OWNER_WALLET
```
Every chat message appears as a small USDC transfer from the user.
