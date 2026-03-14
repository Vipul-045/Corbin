/**
 * demo.ts — Elsa X402 Demo Transactions
 *
 * Runs a series of real micropayment transactions against localhost:3000.
 * Each message auto-pays the owner wallet on Base network via X402.
 *
 * Usage:
 *   npm run demo
 *
 * Prerequisites:
 *   1. npm run server  (in another terminal)
 *   2. DEMO_PRIVATE_KEY set in .env (wallet must have USDC on Base)
 */

import 'dotenv/config';
import axios from 'axios';
import { createChatClient } from './client/chatClient';
import type { TransactionReceipt, DemoSummary, HealthResponse } from './types/index';

// ─── Config ───────────────────────────────────────────────────────────────

const SERVER_URL    = process.env.SERVER_URL    ?? 'http://localhost:3000';
const DEMO_PRIV_KEY = (process.env.DEMO_PRIVATE_KEY?? '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as `0x${string}`;

const DEMO_MESSAGES: string[] = [
  'What is the current price of ETH?',
  'How does X402 micropayments work on Base?',
  'Explain DeFi yield farming in simple terms',
  'What are the top tokens trending on Base network?',
  'How do I swap USDC to WETH using the Elsa API?',
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sep(label = ''): void {
  const line = '─'.repeat(56);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : `\n${line}`);
}

function padEnd(str: string, n: number): string {
  return str.length >= n ? str.slice(0, n) : str + ' '.repeat(n - str.length);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function runDemo(): Promise<void> {
  sep('ELSA X402 · DEMO TRANSACTIONS (TypeScript)');
  console.log(`Server  : ${SERVER_URL}`);
  console.log(`Time    : ${new Date().toISOString()}`);

  // ── Step 1: Health check ─────────────────────────────────────────────
  sep('Step 1 — Health Check  (free · no payment)');
  let health: HealthResponse;
  try {
    const res = await axios.get<HealthResponse>(`${SERVER_URL}/health`);
    health = res.data;
    console.log('✓ Server is up');
    console.log(`  Owner wallet : ${health.owner}`);
    console.log(`  /chat price  : ${health.pricing.chat}   per message`);
    console.log(`  /premium     : ${health.pricing.premium} per message`);
    console.log(`  Network      : ${health.payment.network}`);
    console.log(`  Token        : ${health.payment.token}`);
  } catch {
    console.error('✗ Cannot reach server. Run:  npm run server');
    process.exit(1);
  }

  // ── Step 2: Init client ───────────────────────────────────────────────
  sep('Step 2 — Initialize X402 Client');
  const client = createChatClient({
    privateKey: DEMO_PRIV_KEY,
    baseUrl:    SERVER_URL,
  });
  console.log(`\n✓ Client ready`);
  console.log(`  User wallet  : ${client.walletAddress}`);
  console.log(`  Auto-pays via X402 on every /chat call`);

  // ── Step 3: Standard chat transactions ───────────────────────────────
  sep('Step 3 — Standard Chat Transactions  ($0.001 each)');

  let totalPaid = 0;
  const receipts: TransactionReceipt[] = [];

  for (let i = 0; i < DEMO_MESSAGES.length; i++) {
    const msg = DEMO_MESSAGES[i];
    process.stdout.write(`\n[TX ${i + 1}/${DEMO_MESSAGES.length}] "${msg.slice(0, 45)}..."\n`);
    process.stdout.write(`  → Paying $0.001 USDC to owner on Base...\n`);

    try {
      const result = await client.chat(msg);
      const charged = parseFloat(result.meta.charged.replace('$', ''));
      totalPaid += charged;

      console.log(`  ✓ Paid ${result.meta.charged} → ${result.meta.paid_to.slice(0, 20)}...`);
      console.log(`  ✓ Response: "${result.response.slice(0, 60)}..."`);

      receipts.push({
        tx:        i + 1,
        message:   msg.slice(0, 42),
        charged:   result.meta.charged,
        paid_to:   result.meta.paid_to,
        timestamp: result.meta.timestamp,
        status:    'success',
      });
    } catch (err: unknown) {
      const e = err as { response?: { status: number }; message: string };
      if (e.response?.status === 402) {
        console.log('  ✗ 402 — wallet needs USDC on Base to pay');
      } else {
        console.log(`  ✗ Error: ${e.message}`);
      }
      receipts.push({ tx: i + 1, message: msg.slice(0, 42), status: 'failed', error: e.message });
    }

    await sleep(400);
  }

  // ── Step 4: Premium transaction ───────────────────────────────────────
  sep('Step 4 — Premium Transaction  ($0.005)');
  process.stdout.write(`  → Paying $0.005 USDC for premium response...\n`);

  try {
    const premium = await client.chatPremium(
      'Give me a detailed analysis of the Base network DeFi ecosystem',
      ['prior context: user is a DeFi developer']
    );
    totalPaid += 0.005;
    console.log(`  ✓ Paid $0.005 → ${premium.meta.paid_to.slice(0, 20)}...`);
    console.log(`  ✓ Response: "${premium.response.slice(0, 80)}..."`);
    receipts.push({
      tx:        DEMO_MESSAGES.length + 1,
      message:   'Premium: Base DeFi analysis',
      charged:   '$0.005',
      paid_to:   premium.meta.paid_to,
      timestamp: premium.meta.timestamp,
      status:    'success',
    });
  } catch (err: unknown) {
  const e = err as { response?: { status: number }; message: string };
  if (e.response?.status === 402) {
    console.log('  ✗ 402 — wallet needs USDC on Base to pay');  // ← hiding real error
  } else {
    console.log(`  ✗ Error: ${e.message}`);
  }
  }

  // ── Step 5: Token search ──────────────────────────────────────────────
  sep('Step 5 — Token Search  ($0.0005)');
  process.stdout.write(`  → Searching for "USDC"...\n`);

  try {
    const search = await client.searchToken('USDC');
    totalPaid += 0.0005;
    console.log(`  ✓ Found ${search.results.length} results · Paid ${search.charged}`);
    search.results.forEach((r) => {
      console.log(`    ${r.symbol.padEnd(6)} ${r.name.padEnd(16)} ${r.price.padEnd(12)} ${r.chain}`);
    });
  } catch (err: unknown) {
      const e = err as any;
      
      // print everything so we can see exact error
      console.log(`  ✗ Status  : ${e.response?.status}`);
      console.log(`  ✗ Error   : ${e.message}`);
      console.log(`  ✗ Detail  : ${JSON.stringify(e.response?.data, null, 2)}`);
      console.log(`  ✗ Cause   : ${e.cause?.message ?? 'none'}`);
      
    }

  // ── Summary ───────────────────────────────────────────────────────────
  sep('Transaction Receipt Summary');

  const successful = receipts.filter((r) => r.status === 'success').length;

  const summary: DemoSummary = {
    total_transactions: receipts.length,
    successful,
    failed:             receipts.length - successful,
    total_paid_usd:     totalPaid,
    receipts,
  };

  console.log(`\n${'#'.padEnd(4)} ${padEnd('Message', 44)} ${padEnd('Cost', 8)} Status`);
  console.log('─'.repeat(72));

  receipts.forEach((r) => {
    const cost   = r.charged ?? '—      ';
    const status = r.status === 'success' ? '✓ paid' : '✗ failed';
    console.log(`${String(r.tx).padEnd(4)} ${padEnd(r.message, 44)} ${padEnd(cost, 8)} ${status}`);
  });

  console.log('─'.repeat(72));
  console.log(`Total paid   : $${totalPaid.toFixed(4)} USDC`);
  console.log(`Transactions : ${summary.successful}/${summary.total_transactions} successful`);
  console.log(`\n✓ All payments went to owner: ${health.owner}`);
  console.log(`  View on BaseScan: https://basescan.org/address/${health.owner}`);
}

runDemo().catch((err: Error) => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
