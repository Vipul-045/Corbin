import 'dotenv/config';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// USDC contract on Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ name: '',        type: 'uint256' }],
  },
] as const;

async function checkBalances() {
  // ── wallets ──────────────────────────────────────────────
  const OWNER_ADDRESS = process.env.OWNER_WALLET as `0x${string}`;
  const USER_KEY      = process.env.DEMO_PRIVATE_KEY as `0x${string}`;
  const USER_ADDRESS  = privateKeyToAccount(USER_KEY).address;

  // ── public client to read chain ──────────────────────────
  const client = createPublicClient({
    chain:     baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  // ── fetch ETH balances ────────────────────────────────────
  const ownerEth = await client.getBalance({ address: OWNER_ADDRESS });
  const userEth  = await client.getBalance({ address: USER_ADDRESS });

  // ── fetch USDC balances ───────────────────────────────────
  const ownerUsdc = await client.readContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: 'balanceOf',
    args:         [OWNER_ADDRESS],
  });

  const userUsdc = await client.readContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: 'balanceOf',
    args:         [USER_ADDRESS],
  });

  // ── print ─────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log('  Wallet Balances — Base Sepolia');
  console.log('─────────────────────────────────────────────');

  console.log('\nOwner Wallet (receives payments):');
  console.log(`  Address : ${OWNER_ADDRESS}`);
  console.log(`  ETH     : ${formatUnits(ownerEth, 18)} ETH`);
  console.log(`  USDC    : ${formatUnits(ownerUsdc, 6)} USDC`);

  console.log('\nUser Wallet (sends payments):');
  console.log(`  Address : ${USER_ADDRESS}`);
  console.log(`  ETH     : ${formatUnits(userEth, 18)} ETH`);
  console.log(`  USDC    : ${formatUnits(userUsdc, 6)} USDC`);

  console.log('\n─────────────────────────────────────────────');

  // ── warnings ──────────────────────────────────────────────
  if (userEth === 0n) {
    console.log('⚠️  User wallet has NO ETH — cannot pay gas');
    console.log('   Get test ETH: https://portal.cdp.coinbase.com/products/faucet');
  }
  if (userUsdc === 0n) {
    console.log('⚠️  User wallet has NO USDC — cannot pay for chat');
    console.log('   Get test USDC: https://faucet.circle.com');
  }
  if (userEth > 0n && userUsdc > 0n) {
    console.log('✓  User wallet is funded and ready to send payments');
  }

  console.log('─────────────────────────────────────────────\n');
}

checkBalances().catch(console.error);