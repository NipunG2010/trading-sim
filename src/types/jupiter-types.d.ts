import { PublicKey, Transaction } from '@solana/web3.js';
import JSBI from 'jsbi';

export interface MarketInfo {
  inAmount: JSBI;
  outAmount: JSBI;
  // Add other required properties
}

export interface RouteInfo {
  marketInfos: MarketInfo[];
  inAmount: JSBI;
  outAmount: JSBI;
  slippageBps: number;
  otherAmountThreshold: JSBI;
  swapMode: string;
  priceImpactPct: number;
}

declare module '@jup-ag/core' {
  export interface Jupiter {
    load(config: {
      connection: any;
      cluster: 'mainnet' | 'devnet' | 'testnet';
    }): Promise<Jupiter>;
    
    computeRoutes(params: {
      inputMint: PublicKey;
      outputMint: PublicKey;
      amount: JSBI;
      slippageBps: number;
    }): Promise<{routesInfos: RouteInfo[]}>;
    
    exchange(params: {
      routeInfo: RouteInfo;
      userPublicKey: PublicKey;
    }): Promise<{swapTransaction: Transaction}>;
  }
}