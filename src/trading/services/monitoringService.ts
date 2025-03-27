// Issue: Lack of transaction monitoring
// Solution: Add real-time monitoring

import { Connection, LogsCallback, TransactionSignature } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { TransactionLog } from '../types';
import { RecoveryService } from './recoveryService';

export class MonitoringService {
  private connection: Connection;
  private recoveryService: RecoveryService;
  private subscriptions: number[] = [];
  private logger = logger.child({ module: 'MonitoringService' });

  constructor(connection: Connection, recoveryService: RecoveryService) {
    this.connection = connection;
    this.recoveryService = recoveryService;
  }

  async startMonitoring(): Promise<void> {
    try {
      // Monitor all transactions
      const sub = this.connection.onLogs('all', this.handleTransactionLogs);
      this.subscriptions.push(sub);
      
      this.logger.info('Transaction monitoring started');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to start transaction monitoring', { error: errorMessage });
      throw error;
    }
  }

  private handleTransactionLogs: LogsCallback = async (logs) => {
    try {
      const transactionLog: TransactionLog = {
        signature: logs.signature,
        err: logs.err,
        timestamp: Date.now(),
        type: logs.err ? 'error' : 'send'
      };

      if (logs.err) {
        this.logger.error('Transaction failed', transactionLog);
        await this.recoveryService.handleFailedTransaction(logs.signature);
      } else {
        this.logger.info('Transaction succeeded', transactionLog);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error handling transaction logs', { error: errorMessage });
    }
  };

  async stopMonitoring(): Promise<void> {
    try {
      await Promise.all(
        this.subscriptions.map(sub => 
          this.connection.removeOnLogsListener(sub)
        )
      );
      this.subscriptions = [];
      this.logger.info('Transaction monitoring stopped');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to stop transaction monitoring', { error: errorMessage });
      throw error;
    }
  }

  async getTransactionStatus(signature: TransactionSignature): Promise<TransactionLog> {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      
      return {
        signature,
        err: status?.value?.err || null,
        timestamp: Date.now(),
        type: status?.value?.err ? 'error' : 'send'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get transaction status', { 
        signature, 
        error: errorMessage 
      });
      throw error;
    }
  }
} 