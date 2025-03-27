import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TokenService } from './tokenService';
import { TransactionService } from './transactionService';
import { BotDetectionService } from './botDetectionService';
import { ProfitTakingService } from './profitTakingService';
import { TradingPatterns, TradingPatternType } from './tradingPatterns';
import { BalanceUtils } from '../utils/balanceUtils';
import { logger } from '../utils/logger';
import { TransactionOptions, TRANSACTION_DEFAULTS } from '../types';

interface OrchestratorConfig {
  patternDuration: number;
  profitAnalysisInterval: number;
  minProfitThreshold: number;
  maxLossThreshold: number;
  tradeSize: number;
}

export class TradingOrchestrator {
  private connection: Connection;
  private tokenService: TokenService;
  private transactionService: TransactionService;
  private botDetectionService: BotDetectionService;
  private profitTakingService: ProfitTakingService;
  private tradingPatterns: TradingPatterns;
  private balanceUtils: BalanceUtils;
  private logger = logger.child({ module: 'Orchestrator' });

  private isRunning: boolean = false;
  private profitAnalysisInterval?: NodeJS.Timeout;
  
  private config: OrchestratorConfig = {
    patternDuration: 48 * 60 * 60 * 1000, // 48 hours
    profitAnalysisInterval: 5 * 60 * 1000, // 5 minutes
    minProfitThreshold: 0.02, // 2%
    maxLossThreshold: 0.01, // 1%
    tradeSize: 1000
  };

  constructor(
    connection: Connection,
    payer: Keypair,
    config?: Partial<OrchestratorConfig>
  ) {
    this.connection = connection;
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize services
    this.balanceUtils = new BalanceUtils(connection);
    this.transactionService = new TransactionService(connection, payer);
    this.tokenService = new TokenService(
      connection,
      this.transactionService,
      this.balanceUtils
    );
    this.botDetectionService = new BotDetectionService();
    this.profitTakingService = new ProfitTakingService(
      this.tokenService,
      this.botDetectionService,
      this.balanceUtils,
      {
        minProfitThreshold: this.config.minProfitThreshold,
        maxLossThreshold: this.config.maxLossThreshold,
        tradeSize: this.config.tradeSize
      }
    );
    this.tradingPatterns = new TradingPatterns(
      this.tokenService,
      this.balanceUtils
    );
  }

  async start(
    mint: PublicKey,
    wallets: Keypair[],
    profitWallet: Keypair,
    options: TransactionOptions = {}
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Trading simulation is already running');
    }

    this.isRunning = true;
    const mergedOptions = { ...TRANSACTION_DEFAULTS, ...options };
    const startTime = Date.now();

    try {
      // Verify all wallets have sufficient balance
      await Promise.all([
        ...wallets.map(wallet => 
          this.balanceUtils.verifyBalance(wallet.publicKey, 0, { includeTokenBalance: true })
        ),
        this.balanceUtils.verifyBalance(profitWallet.publicKey, this.config.tradeSize)
      ]);

      this.logger.info('Starting trading simulation', {
        mint: mint.toString(),
        wallets: wallets.length,
        duration: this.config.patternDuration
      });

      // Start profit analysis interval
      this.profitAnalysisInterval = setInterval(async () => {
        try {
          await this.profitTakingService.analyzeBotActivity(mint);
          await this.profitTakingService.executeProfitTaking(
            mint,
            profitWallet,
            mergedOptions
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Error in profit analysis interval', { error: errorMessage });
        }
      }, this.config.profitAnalysisInterval);

      // Execute trading patterns
      const patterns = Object.values(TradingPatternType);
      let currentPatternIndex = 0;

      while (Date.now() - startTime < this.config.patternDuration && this.isRunning) {
        const pattern = patterns[currentPatternIndex];
        
        try {
          await this.tradingPatterns.startPattern(
            pattern,
            mint,
            wallets,
            {
              duration: this.config.patternDuration / patterns.length,
              intensity: Math.random() * 5 + 5, // Random intensity between 5-10
              targetPrice: 0 // Let the market decide
            }
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Error executing trading pattern', {
            pattern,
            error: errorMessage
          });
        }

        currentPatternIndex = (currentPatternIndex + 1) % patterns.length;
      }

      this.logger.info('Trading simulation completed', {
        duration: Date.now() - startTime,
        patterns: patterns.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in trading simulation', { error: errorMessage });
      throw error;
    } finally {
      await this.stop();
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.profitAnalysisInterval) {
      clearInterval(this.profitAnalysisInterval);
    }

    try {
      this.tradingPatterns.stopPattern();
      this.profitTakingService.clearOpportunities();
      this.botDetectionService.resetMetrics();

      this.logger.info('Trading simulation stopped');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error stopping trading simulation', { error: errorMessage });
      throw error;
    }
  }

  getStatus(): {
    isRunning: boolean;
    opportunities: number;
    detectedBots: number;
  } {
    return {
      isRunning: this.isRunning,
      opportunities: this.profitTakingService.getOpportunities().length,
      detectedBots: this.botDetectionService.getAllBotMetrics().length
    };
  }
} 