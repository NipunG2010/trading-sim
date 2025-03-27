import { PublicKey, Keypair } from '@solana/web3.js';
import { TokenService } from './tokenService';
import { BotDetectionService } from './botDetectionService';
import { BalanceUtils } from '../utils/balanceUtils';
import { logger } from '../utils/logger';
import { TransactionOptions, TRANSACTION_DEFAULTS } from '../types';

interface ProfitStrategy {
  minProfitThreshold: number;
  maxLossThreshold: number;
  tradeSize: number;
  cooldownPeriod: number;
}

interface TradeOpportunity {
  targetAddress: string;
  predictedProfit: number;
  confidence: number;
  timestamp: number;
}

export class ProfitTakingService {
  private tokenService: TokenService;
  private botDetectionService: BotDetectionService;
  private balanceUtils: BalanceUtils;
  private logger = logger.child({ module: 'ProfitTaking' });
  
  private opportunities: Map<string, TradeOpportunity> = new Map();
  private lastTradeTime: Map<string, number> = new Map();
  
  private strategy: ProfitStrategy = {
    minProfitThreshold: 0.02, // 2% minimum profit
    maxLossThreshold: 0.01, // 1% maximum loss
    tradeSize: 1000, // Base trade size
    cooldownPeriod: 5 * 60 * 1000 // 5 minutes
  };

  constructor(
    tokenService: TokenService,
    botDetectionService: BotDetectionService,
    balanceUtils: BalanceUtils,
    strategy?: Partial<ProfitStrategy>
  ) {
    this.tokenService = tokenService;
    this.botDetectionService = botDetectionService;
    this.balanceUtils = balanceUtils;
    if (strategy) {
      this.strategy = { ...this.strategy, ...strategy };
    }
  }

  async analyzeBotActivity(mint: PublicKey): Promise<void> {
    try {
      const botMetrics = this.botDetectionService.getAllBotMetrics();
      
      for (const metrics of botMetrics) {
        const opportunity = this.calculateOpportunity(metrics);
        
        if (opportunity.predictedProfit >= this.strategy.minProfitThreshold &&
            opportunity.confidence >= 0.8) {
          this.opportunities.set(metrics.address, opportunity);
          
          this.logger.info('Profit opportunity detected', {
            targetAddress: metrics.address,
            predictedProfit: opportunity.predictedProfit,
            confidence: opportunity.confidence
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error analyzing bot activity', { error: errorMessage });
      throw error;
    }
  }

  async executeProfitTaking(
    mint: PublicKey,
    wallet: Keypair,
    options: TransactionOptions = {}
  ): Promise<void> {
    const now = Date.now();
    const mergedOptions = { ...TRANSACTION_DEFAULTS, ...options };

    try {
      // Sort opportunities by predicted profit * confidence
      const sortedOpportunities = Array.from(this.opportunities.entries())
        .filter(([address, opp]) => {
          const lastTrade = this.lastTradeTime.get(address) || 0;
          return now - lastTrade >= this.strategy.cooldownPeriod;
        })
        .sort(([, a], [, b]) => 
          (b.predictedProfit * b.confidence) - (a.predictedProfit * a.confidence)
        );

      for (const [address, opportunity] of sortedOpportunities) {
        try {
          // Verify wallet has sufficient balance
          await this.balanceUtils.verifyBalance(
            wallet.publicKey,
            this.strategy.tradeSize,
            { includeTokenBalance: true }
          );

          // Execute counter-trade
          const targetAddress = new PublicKey(address);
          await this.tokenService.transferTokens(
            wallet,
            targetAddress,
            mint,
            this.calculateTradeSize(opportunity),
            mergedOptions
          );

          this.lastTradeTime.set(address, now);
          this.opportunities.delete(address);

          this.logger.info('Profit-taking trade executed', {
            targetAddress: address,
            profit: opportunity.predictedProfit,
            confidence: opportunity.confidence
          });

          // Add delay between trades
          if (mergedOptions.delayBetweenTransactions) {
            await new Promise(resolve => 
              setTimeout(resolve, mergedOptions.delayBetweenTransactions)
            );
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Error executing profit-taking trade', {
            targetAddress: address,
            error: errorMessage
          });
          // Continue with next opportunity
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in profit-taking execution', { error: errorMessage });
      throw error;
    }
  }

  private calculateOpportunity(metrics: any): TradeOpportunity {
    // Calculate predicted profit based on pattern recognition
    const patternWeight = 0.6;
    const volumeWeight = 0.4;
    
    const predictedProfit = 
      (metrics.patternScore * patternWeight + 
       metrics.volumeScore * volumeWeight) * 0.05; // Max 5% predicted profit

    // Calculate confidence based on metrics
    const confidence = 
      (metrics.patternScore * patternWeight +
       metrics.volumeScore * volumeWeight);

    return {
      targetAddress: metrics.address,
      predictedProfit,
      confidence,
      timestamp: Date.now()
    };
  }

  private calculateTradeSize(opportunity: TradeOpportunity): number {
    // Adjust trade size based on confidence and predicted profit
    const confidenceAdjustment = Math.pow(opportunity.confidence, 2);
    const profitAdjustment = 
      Math.min(opportunity.predictedProfit / this.strategy.minProfitThreshold, 2);
    
    return Math.floor(
      this.strategy.tradeSize * confidenceAdjustment * profitAdjustment
    );
  }

  getOpportunities(): TradeOpportunity[] {
    return Array.from(this.opportunities.values())
      .sort((a, b) => 
        (b.predictedProfit * b.confidence) - (a.predictedProfit * a.confidence)
      );
  }

  clearOpportunities(): void {
    this.opportunities.clear();
    this.lastTradeTime.clear();
    this.logger.info('Profit-taking opportunities cleared');
  }
} 