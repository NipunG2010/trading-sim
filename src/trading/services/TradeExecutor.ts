import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { TokenService } from './tokenService';
import { TransactionService } from './transactionService';
import { BalanceUtils } from '../utils/balanceUtils';
import { TransactionOptions } from '../types';

interface Account {
    publicKey: string;
    privateKey: number[];
    type: 'WHALE' | 'RETAIL';
}

interface TradeParams {
  connection: Connection;
  sender: Account;
  receiver: Account;
  amount: number;
  tokenInfo: {
    mint: string;
    decimals: number;
  };
  options?: {
    slippage?: number;
    priorityFee?: number;
  };
}

export class TradeExecutor {
  /**
   * Execute a token trade
   * @param {TradeParams} params 
   * @returns {Promise<{success: boolean, txId?: string, error?: string}>}
   */
  static async executeTrade(params: TradeParams) {
    try {
      // Validate trade parameters
      if (!this.validateTrade(params)) {
        return { success: false, error: 'Invalid trade parameters' };
      }

      // Convert Account to Keypair
      const senderKeypair = Keypair.fromSecretKey(
        Uint8Array.from(params.sender.privateKey)
      );

      // Initialize services
      const tokenService = new TokenService(
        params.connection,
        new TransactionService(params.connection, senderKeypair),
        new BalanceUtils(params.connection)
      );

      // Verify sender has sufficient balance
      await new BalanceUtils(params.connection).verifyBalance(
        new PublicKey(params.sender.publicKey),
        params.amount
      );

      // Execute trade
      const txId = await tokenService.transferTokens(
        senderKeypair,
        new PublicKey(params.receiver.publicKey),
        new PublicKey(params.tokenInfo.mint),
        params.amount,
        this.mapToTransactionOptions(params.options)
      );

      return { success: true, txId };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Trade execution failed' 
      };
    }
  }

  private static validateTrade(params: TradeParams): boolean {
    return (
      params.amount > 0 &&
      params.sender?.privateKey?.length > 0 &&
      params.receiver?.publicKey?.length > 0
    );
  }

  private static mapToTransactionOptions(
    options?: { slippage?: number; priorityFee?: number }
  ): TransactionOptions {
    return {
      commitment: 'confirmed',
      ...(options?.priorityFee && { priorityFee: options.priorityFee }),
      ...(options?.slippage && { slippage: options.slippage })
    };
  }
}