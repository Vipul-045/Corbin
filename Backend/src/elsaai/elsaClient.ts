import { withPaymentInterceptor } from 'x402-axios';
import axios from 'axios';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

// Create wallet client
const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: base,
  transport: http('https://mainnet.base.org')
});

// Apply X402 payment interceptor
const client = withPaymentInterceptor(
  axios.create({ baseURL: 'https://x402-api.heyelsa.ai' }),
  walletClient
);