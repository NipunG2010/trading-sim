import { Connection, Transaction, Signer, sendAndConfirmTransaction } from '@solana/web3.js';
import { TransactionOptions, TransactionResult, TRANSACTION_DEFAULTS } from '../types';
import { logger } from '../utils/logger';

export class TransactionService {
  private connection: Connection;
  private payer: Signer;

  constructor(connection: Connection, payer: Signer) {
    this.connection = connection;
    this.payer = payer;
  }

  async executeTransaction(
    transaction: Transaction,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    let retries = options.maxRetries || TRANSACTION_DEFAULTS.MAX_RETRIES;
    let delay = TRANSACTION_DEFAULTS.INITIAL_DELAY;
    
    while (retries > 0) {
      try {
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [this.payer],
          {
            commitment: options.commitment || TRANSACTION_DEFAULTS.COMMITMENT,
            preflightCommitment: options.preflightCommitment,
            skipPreflight: options.skipPreflight || false,
          }
        );

        logger.info('Transaction executed successfully', {
          signature,
          retries: TRANSACTION_DEFAULTS.MAX_RETRIES - retries
        });

        return {
          success: true,
          signature,
          retries: TRANSACTION_DEFAULTS.MAX_RETRIES - retries
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('rate limit') || errorMessage.includes('blockhash not found')) {
          logger.warn('Transaction retry needed', {
            error: errorMessage,
            retriesLeft: retries - 1,
            delay
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          retries--;
          continue;
        }

        logger.error('Transaction failed', {
          error: errorMessage,
          retries: TRANSACTION_DEFAULTS.MAX_RETRIES - retries
        });

        return {
          success: false,
          error: errorMessage,
          retries: TRANSACTION_DEFAULTS.MAX_RETRIES - retries
        };
      }
    }

    const maxRetriesError = 'Max retries exceeded';
    logger.error(maxRetriesError);
    return {
      success: false,
      error: maxRetriesError,
      retries: TRANSACTION_DEFAULTS.MAX_RETRIES
    };
  }

  async executeBatchTransactions(
    transactions: Transaction[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult[]> {
    const results: TransactionResult[] = [];
    const batchSize = TRANSACTION_DEFAULTS.MAX_BATCH_SIZE;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(tx => this.executeTransaction(tx, options))
      );
      results.push(...batchResults);

      if (i + batchSize < transactions.length) {
        // Add delay between batches to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, TRANSACTION_DEFAULTS.INITIAL_DELAY));
      }
    }

    return results;
  }
} 