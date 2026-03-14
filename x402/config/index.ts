import 'dotenv/config';
import type { ServerConfig } from '../types/index';

export const config: ServerConfig = {
  port: parseInt(process.env.PORT ?? '3001', 10),

  // Your wallet — receives all micropayments from users
  ownerWallet: process.env.OWNER_WALLET ?? '0x0D224DB2830A32bc75212A0ec6f0008C2B3ae5b5',

  pricing: {
    chat:    process.env.PRICE_CHAT    ?? '$0.001',   // $0.001 per standard message
    premium: process.env.PRICE_PREMIUM ?? '$0.005',   // $0.005 per premium message
    search:  process.env.PRICE_SEARCH  ?? '$0.0005',  // $0.0005 per token search
  },

  network: 'base-sepolia',
};
