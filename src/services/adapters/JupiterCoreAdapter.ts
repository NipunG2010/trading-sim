import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Jupiter } from '@jup-ag/core';
import { IJupiterAdapter } from './JupiterAdapter';
import JSBI from 'jsbi';
import { toJSBIAmount, fromJSBIAmount } from '../../utils/jsbi-utils';

export class JupiterCoreAdapter implements IJupiterAdapter {
  private jupiter: Jupiter;
  private connection: Connection;

  constructor(connection: Connection, jupiter: Jupiter) {
    this.connection = connection;
    this.jupiter = jupiter;
  }

  async findBestRoute(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    slippageBps: number;
  }): Promise<RouteInfo | null> {
    try {
      const { routesInfos } = await this.jupiter.computeRoutes({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: toJSBIAmount(params.amount),
        slippageBps: params.slippageBps
      });
      return routesInfos[0] || null;
    } catch (error) {
      console.error('Error finding route:', error);
      return null;
    }
  }

  async executeTrade(params: {
    route: RouteInfo;
    walletPublicKey: PublicKey;
  }): Promise<Transaction> {
    const { swapTransaction } = await this.jupiter.exchange({
      routeInfo: params.route,
      userPublicKey: params.walletPublicKey
    });
    return swapTransaction;
  }

  async getPriceImpact(params: {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
  }): Promise<number> {
    const route = await this.findBestRoute({
      ...params,
      slippageBps: 50 // Default slippage
    });
    return route?.priceImpactPct || 0;
  }
}