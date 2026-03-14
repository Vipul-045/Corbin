declare module 'x402-axios' {
  import type { AxiosInstance } from 'axios';

  interface WalletClient {
    account?: { address: string };
    sendTransaction: (tx: unknown) => Promise<string>;
    signMessage: (args: unknown) => Promise<string>;
  }

  export function withPaymentInterceptor(
    axiosInstance: AxiosInstance,
    walletClient: WalletClient
  ): AxiosInstance;
}