declare module 'x402-express' {
  import type { RequestHandler } from 'express';

  interface RouteConfig {
    price: string;
    network: string;
    config?: { description?: string };
  }

  interface FacilitatorConfig {
    url: string;
    network: string;
  }

  export function paymentMiddleware(
    ownerWallet: string,
    routes: Record<string, RouteConfig>,
    facilitator: FacilitatorConfig
  ): RequestHandler;

  export const facilitatorUrl: string;
  export const network: string;
}