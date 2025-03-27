import { PublicKey, Keypair } from '@solana/web3.js';
import { TokenService } from './tokenService';
import { BalanceUtils } from '../utils/balanceUtils';
import { logger } from '../utils/logger';

export enum TradingPatternType {
  ACCUMULATION = 'accumulation',
  DISTRIBUTION = 'distribution',
  BREAKOUT = 'breakout',
  CONSOLIDATION = 'consolidation',
  WHALE_DUMP = 'whale_dump',
  RETAIL_FOMO = 'retail_fomo'
}

interface TradingPatternConfig {
  duration: number; // Duration in milliseconds
  intensity: number; // 1-10 scale
  targetPrice?: number; // Optional target price
  stopLoss?: number; // Optional stop loss
}

interface TradeParameters {
  amount: number;
  price: number;
  delay: number;
}

export class TradingPatterns {
  private tokenService: TokenService;
  private balanceUtils: BalanceUtils;
  private logger = logger.child({ module: 'TradingPatterns' });
  private isRunning: boolean = false;
  private stopRequested: boolean = false;

  constructor(
    tokenService: TokenService,
    balanceUtils: BalanceUtils
  ) {
    this.tokenService = tokenService;
    this.balanceUtils = balanceUtils;
  }

  async startPattern(
    pattern: TradingPatternType,
    mint: PublicKey,
    wallets: Keypair[],
    config: TradingPatternConfig
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('A trading pattern is already running');
    }

    this.isRunning = true;
    this.stopRequested = false;
    const startTime = Date.now();

    try {
      // Verify all wallets have sufficient balance
      await Promise.all(wallets.map(wallet => 
        this.balanceUtils.verifyBalance(wallet.publicKey, 0, { includeTokenBalance: true })
      ));

      this.logger.info('Starting trading pattern', {
        pattern,
        mint: mint.toString(),
        wallets: wallets.length,
        config
      });

      while (Date.now() - startTime < config.duration && !this.stopRequested) {
        const tradeParams = this.calculateTradeParameters(pattern, config);
        
        // Select random wallets for the trade
        const [fromWallet, toWallet] = this.selectTradeWallets(wallets);
        
        try {
          const signature = await this.tokenService.transferTokens(
            fromWallet,
            toWallet.publicKey,
            mint,
            tradeParams.amount,
            { delayBetweenTransactions: tradeParams.delay }
          );

          this.logger.info('Trade executed successfully', {
            pattern,
            signature,
            amount: tradeParams.amount,
            price: tradeParams.price
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Error executing trade', {
            pattern,
            error: errorMessage
          });
          // Continue with next trade even if one fails
        }

        await new Promise(resolve => setTimeout(resolve, tradeParams.delay));
      }

      this.logger.info('Trading pattern completed', {
        pattern,
        duration: Date.now() - startTime
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in trading pattern', {
        pattern,
        error: errorMessage
      });
      throw error;
    } finally {
      this.isRunning = false;
      this.stopRequested = false;
    }
  }

  stopPattern(): void {
    if (!this.isRunning) {
      throw new Error('No trading pattern is currently running');
    }
    this.stopRequested = true;
    this.logger.info('Stop requested for current trading pattern');
  }

  private calculateTradeParameters(
    pattern: TradingPatternType,
    config: TradingPatternConfig
  ): TradeParameters {
    const baseDelay = 1000; // 1 second base delay
    const baseAmount = 1000; // Base trade amount

    // Adjust parameters based on pattern and intensity
    switch (pattern) {
      case TradingPatternType.ACCUMULATION:
        return {
          amount: baseAmount * (1 + config.intensity * 0.1),
          price: config.targetPrice || 0,
          delay: baseDelay * (1 + (10 - config.intensity) * 0.2)
        };

      case TradingPatternType.DISTRIBUTION:
        return {
          amount: baseAmount * (1 + config.intensity * 0.15),
          price: config.targetPrice || 0,
          delay: baseDelay * (1 + (10 - config.intensity) * 0.1)
        };

      case TradingPatternType.BREAKOUT:
        return {
          amount: baseAmount * (1 + config.intensity * 0.2),
          price: config.targetPrice || 0,
          delay: baseDelay * (1 + (10 - config.intensity) * 0.05)
        };

      case TradingPatternType.CONSOLIDATION:
        return {
          amount: baseAmount * (1 + config.intensity * 0.05),
          price: config.targetPrice || 0,
          delay: baseDelay * (1 + (10 - config.intensity) * 0.3)
        };

      case TradingPatternType.WHALE_DUMP:
        return {
          amount: baseAmount * (1 + config.intensity * 0.25),
          price: config.targetPrice || 0,
          delay: baseDelay * (1 + (10 - config.intensity) * 0.05)
        };

      case TradingPatternType.RETAIL_FOMO:
        return {
          amount: baseAmount * (1 + config.intensity * 0.1),
          price: config.targetPrice || 0,
          delay: baseDelay * (1 + (10 - config.intensity) * 0.15)
        };

      default:
        throw new Error(`Unsupported trading pattern: ${pattern}`);
    }
  }

  private selectTradeWallets(wallets: Keypair[]): [Keypair, Keypair] {
    if (wallets.length < 2) {
      throw new Error('At least 2 wallets are required for trading');
    }

    const fromIndex = Math.floor(Math.random() * wallets.length);
    let toIndex;
    do {
      toIndex = Math.floor(Math.random() * wallets.length);
    } while (toIndex === fromIndex);

    return [wallets[fromIndex], wallets[toIndex]];
  }
} 