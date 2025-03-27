import { Connection, PublicKey } from '@solana/web3.js';
import { BaseTradingPattern } from './BaseTradingPattern';
import {
  TradingPatternType,
  TradingPatternConfig,
  TradeParameters,
  WalletInfo,
  PatternPhase
} from '../types/TradingPatternTypes';
import { logger } from '../../utils/logger';

interface MAConfig extends TradingPatternConfig {
  shortPeriod: number;
  longPeriod: number;
  signalPeriod: number;
}

/**
 * Moving Average Crossover Pattern Implementation
 * Uses short and long moving averages to generate trading signals
 */
export class MovingAverageCrossover extends BaseTradingPattern {
  private shortMA: number[];
  private longMA: number[];
  private signal: number[];
  private prices: number[];
  protected override config: MAConfig;

  constructor(
    connection: Connection,
    tokenMint: PublicKey,
    config: MAConfig,
    wallets: WalletInfo[]
  ) {
    super(connection, tokenMint, config, wallets);
    this.config = {
      ...config,
      shortPeriod: config.shortPeriod || 10,
      longPeriod: config.longPeriod || 20,
      signalPeriod: config.signalPeriod || 9
    };
    this.shortMA = [];
    this.longMA = [];
    this.signal = [];
    this.prices = [];
  }

  /**
   * Calculate moving averages and generate trading signals
   */
  private calculateIndicators(): void {
    // Update price array
    this.prices.push(this.state.currentPrice);

    // Calculate short MA
    if (this.prices.length >= this.config.shortPeriod) {
      const shortSum = this.prices
        .slice(-this.config.shortPeriod)
        .reduce((a, b) => a + b, 0);
      this.shortMA.push(shortSum / this.config.shortPeriod);
    }

    // Calculate long MA
    if (this.prices.length >= this.config.longPeriod) {
      const longSum = this.prices
        .slice(-this.config.longPeriod)
        .reduce((a, b) => a + b, 0);
      this.longMA.push(longSum / this.config.longPeriod);
    }

    // Calculate signal line
    if (this.shortMA.length > 0 && this.longMA.length > 0) {
      const diff = this.shortMA[this.shortMA.length - 1] - this.longMA[this.longMA.length - 1];
      this.signal.push(diff);
    }
  }

  /**
   * Get trading signal based on moving average crossovers
   */
  private getTradingSignal(): 'BUY' | 'SELL' | null {
    if (this.signal.length < 2) return null;

    const currentSignal = this.signal[this.signal.length - 1];
    const previousSignal = this.signal[this.signal.length - 2];

    // Bullish crossover
    if (previousSignal < 0 && currentSignal > 0) {
      return 'BUY';
    }

    // Bearish crossover
    if (previousSignal > 0 && currentSignal < 0) {
      return 'SELL';
    }

    return null;
  }

  /**
   * Calculate trade parameters based on signal and configuration
   */
  protected override calculateTradeParameters(): TradeParameters | undefined {
    const signal = this.getTradingSignal();
    if (!signal) return undefined;

    // Select appropriate wallet based on trade size
    const wallet = this.selectWallet(signal);
    if (!wallet) return undefined;

    // Calculate trade amount based on intensity
    const baseAmount = 1000; // Base trade amount
    const amount = baseAmount * (this.config.intensity / 5);

    // Calculate delay based on intensity (faster trades at higher intensity)
    const baseDelay = 1000; // Base delay of 1 second
    const delay = baseDelay * (1 + (10 - this.config.intensity) * 0.2);

    return {
      amount: signal === 'SELL' ? -amount : amount,
      price: this.state.currentPrice,
      delay,
      wallet
    };
  }

  /**
   * Select appropriate wallet for the trade
   */
  private selectWallet(signal: 'BUY' | 'SELL'): WalletInfo | null {
    // Filter wallets based on signal type and balance
    const eligibleWallets = this.wallets.filter(wallet => {
      if (signal === 'BUY') {
        return wallet.balance >= this.state.currentPrice * 1.1; // 10% buffer
      } else {
        return wallet.balance >= 1; // Minimum balance for selling
      }
    });

    if (eligibleWallets.length === 0) {
      logger.warn('No eligible wallets found for trade');
      return null;
    }

    // Select random wallet from eligible ones
    return eligibleWallets[Math.floor(Math.random() * eligibleWallets.length)];
  }

  /**
   * Execute the moving average crossover pattern
   */
  protected override async executePattern(): Promise<void> {
    logger.info('Starting Moving Average Crossover pattern execution');

    while (this.shouldContinue()) {
      try {
        // Update indicators
        this.calculateIndicators();

        // Calculate trade parameters
        const params = this.calculateTradeParameters();
        if (params) {
          // Execute trade
          const txid = await this.executeTrade(params);
          logger.info(`Executed ${params.amount > 0 ? 'BUY' : 'SELL'} trade`, {
            txid,
            amount: params.amount,
            price: params.price
          });

          // Update progress
          const progress = (Date.now() - this.state.startTime) / this.config.duration;
          this.updateState(
            progress,
            progress < 0.3 ? PatternPhase.INITIALIZATION :
            progress < 0.7 ? PatternPhase.ACCUMULATION :
            PatternPhase.COMPLETION
          );
        }

        // Update order book and wait for next iteration
        await this.jupiterService.updateOrderBookState(this.tokenMint, this.tokenMint);
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error('Error in Moving Average Crossover pattern execution', { error });
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Unknown error in pattern execution');
      }
    }

    logger.info('Completed Moving Average Crossover pattern execution');
  }
} 