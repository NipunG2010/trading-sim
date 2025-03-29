// Issue: No transaction recovery mechanism
// Solution: Implement transaction recovery

import { Connection, TransactionSignature } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { TransactionService } from './transactionService';
import { TransactionResult } from '../types';

export class RecoveryService {
  private connection: Connection;
  private transactionService: TransactionService;
  private logger = logger.child({ module: 'RecoveryService' });
  private failedTransactions: Map<string, number> = new Map(); // signature -> retry count
  private readonly MAX_RETRIES = 3;

  constructor(connection: Connection, transactionService: TransactionService) {
    this.connection = connection;
    this.transactionService = transactionService;
  }

  async handleFailedTransaction(signature: TransactionSignature): Promise<void> {
    try {
      const retryCount = this.failedTransactions.get(signature) || 0;
      
      if (retryCount >= this.MAX_RETRIES) {
        this.logger.error('Max retries exceeded for transaction', { signature });
        this.failedTransactions.delete(signature);
        return;
      }

      const transaction = await this.connection.getTransaction(signature);
      if (!transaction) {
        this.logger.error('Failed to fetch transaction', { signature });
        return;
      }

      // Increment retry count
      this.failedTransactions.set(signature, retryCount + 1);

      // Attempt to retry the transaction
      const result = await this.retryTransaction(signature);
      
      if (result.success) {
        this.logger.info('Transaction recovery successful', {
          originalSignature: signature,
          newSignature: result.signature,
          retryCount: retryCount + 1
        });
        this.failedTransactions.delete(signature);
      } else {
        this.logger.warn('Transaction recovery failed', {
          signature,
          error: result.error,
          retryCount: retryCount + 1
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in transaction recovery', {
        signature,
        error: errorMessage
      });
    }
  }

  private async retryTransaction(signature: TransactionSignature): Promise<TransactionResult> {
    try {
      const transaction = await this.connection.getTransaction(signature);
      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      // Rebuild the transaction with new blockhash
      const latestBlockhash = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      return await this.transactionService.executeTransaction(transaction, {
        commitment: 'confirmed',
        maxRetries: 1 // Only try once for recovery
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getFailedTransactions(): Promise<Map<string, number>> {
    return new Map(this.failedTransactions);
  }

  async clearFailedTransaction(signature: TransactionSignature): Promise<void> {
    this.failedTransactions.delete(signature);
    this.logger.info('Cleared failed transaction', { signature });
  }
}