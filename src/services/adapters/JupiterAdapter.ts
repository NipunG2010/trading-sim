import { PublicKey, Transaction } from '@solana/web3.js';
import JSBI from 'jsbi';
import { Jupiter } from '@jup-ag/core';
import { RouteInfo } from '../../types/jupiter-types';

export interface IJupiterAdapter {
  findBestRoute(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    slippageBps: number;
  }): Promise<RouteInfo | null>;

  executeTrade(params: {
    route: RouteInfo;
    walletPublicKey: PublicKey;
  }): Promise<Transaction>;

  getPriceImpact(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
  }): Promise<number>;
}