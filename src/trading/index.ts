import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TradingOrchestrator } from './services/tradingOrchestrator';
import { logger } from './utils/logger';

export class TradingSimulator {
  private orchestrator: TradingOrchestrator;
  private logger = logger.child({ module: 'Simulator' });

  constructor(
    connection: Connection,
    payer: Keypair,
    config?: {
      patternDuration?: number;
      profitAnalysisInterval?: number;
      minProfitThreshold?: number;
      maxLossThreshold?: number;
      tradeSize?: number;
    }
  ) {
    this.orchestrator = new TradingOrchestrator(connection, payer, config);
  }

  async start(
    mint: PublicKey,
    tradingWallets: Keypair[],
    profitWallet: Keypair
  ): Promise<void> {
    try {
      this.logger.info('Starting trading simulator', {
        mint: mint.toString(),
        wallets: tradingWallets.length
      });

      await this.orchestrator.start(mint, tradingWallets, profitWallet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error starting trading simulator', { error: errorMessage });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.orchestrator.stop();
      this.logger.info('Trading simulator stopped');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error stopping trading simulator', { error: errorMessage });
      throw error;
    }
  }

  getStatus(): {
    isRunning: boolean;
    opportunities: number;
    detectedBots: number;
  } {
    return this.orchestrator.getStatus();
  }
}

// Export all necessary types and services
export * from './types';
export * from './services/tokenService';
export * from './services/transactionService';
export * from './services/botDetectionService';
export * from './services/profitTakingService';
export * from './services/tradingPatterns';
export * from './utils/balanceUtils';
export * from './utils/logger'; 