import { Connection } from '@solana/web3.js';
import { BaseStrategy } from './base/BaseStrategy';
import { TradeExecutionResult } from '../types/StrategyTypes';
import { TRADING_CONSTANTS } from '../constants/TradingConstants';

interface PricePoint {
  price: number;
  timestamp: number;
}

export class TechnicalStrategy extends BaseStrategy {
  private priceHistory: PricePoint[] = [];
  private lastMACDCrossover: number = 0;
  private lastMAUpdate: number = 0;
  private macdSignal: number = 0;
  private macdHistogram: number = 0;

  constructor(connection: Connection) {
    super(connection);
  }

  async execute(): Promise<void> {
    this.isActive = true;
    this.currentPhase = 'executing';

    try {
      while (this.isActive) {
        await this.manageTechnicals();
        await this.sleep(TRADING_CONSTANTS.SAFETY.MIN_TIME_BETWEEN_TRADES_MS);
      }
    } catch (error) {
      this.onError(error as Error);
    }
  }

  async executeTrade(amount: number, isBuy: boolean): Promise<TradeExecutionResult> {
    try {
      if (!await this.checkSafetyLimits()) {
        throw new Error('Safety limits exceeded');
      }

      if (amount > TRADING_CONSTANTS.SAFETY.MAX_SINGLE_TRADE_SOL) {
        amount = TRADING_CONSTANTS.SAFETY.MAX_SINGLE_TRADE_SOL;
      }

      // Here you would integrate with Jupiter SDK for actual trading
      // For now, we'll simulate the result
      const result: TradeExecutionResult = {
        success: true,
        txId: 'simulated_tx_' + Date.now(),
        price: this.metrics.price,
        amount: amount,
        timestamp: Date.now()
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        price: this.metrics.price,
        amount: amount,
        timestamp: Date.now()
      };
    }
  }

  async adjustLiquidity(amount: number, isAdd: boolean): Promise<TradeExecutionResult> {
    // This strategy doesn't manage liquidity directly
    throw new Error('Liquidity management not supported in TechnicalStrategy');
  }

  private async manageTechnicals(): Promise<void> {
    // Update technical indicators
    this.updatePriceHistory();
    this.calculateRSI();
    this.calculateMovingAverages();
    this.calculateMACD();

    // Check RSI conditions
    if (this.metrics.rsi > TRADING_CONSTANTS.TECHNICAL.RSI.TARGET_MAX) {
      await this.adjustRSI(false);
    } else if (this.metrics.rsi < TRADING_CONSTANTS.TECHNICAL.RSI.TARGET_MIN) {
      await this.adjustRSI(true);
    }

    // Check MA conditions
    const maDeviation = this.calculateMADeviation();
    if (maDeviation < TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.PRICE_ABOVE_20MA_PERCENT) {
      await this.adjustPriceToMA();
    }

    // Check MACD conditions
    const timeSinceLastCrossover = Date.now() - this.lastMACDCrossover;
    if (timeSinceLastCrossover >= TRADING_CONSTANTS.TECHNICAL.MACD.CROSSOVER_INTERVAL_HOURS * 60 * 60 * 1000) {
      await this.engineerMACDCrossover();
    }
  }

  private updatePriceHistory(): void {
    this.priceHistory.push({
      price: this.metrics.price,
      timestamp: Date.now()
    });

    // Keep only last 24 hours of data
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.priceHistory = this.priceHistory.filter(point => point.timestamp >= oneDayAgo);
  }

  private calculateRSI(): void {
    if (this.priceHistory.length < 2) return;

    const periods = 14;
    let gains = 0;
    let losses = 0;

    // Calculate average gains and losses
    for (let i = 1; i < Math.min(periods + 1, this.priceHistory.length); i++) {
      const change = this.priceHistory[i].price - this.priceHistory[i - 1].price;
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / periods;
    const avgLoss = losses / periods;

    // Calculate RSI
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    this.metrics.rsi = 100 - (100 / (1 + rs));
  }

  private calculateMovingAverages(): void {
    if (this.priceHistory.length < TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.MA_PERIODS.LONG) return;

    // Calculate short MA (20-hour)
    const shortPrices = this.priceHistory.slice(-TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.MA_PERIODS.SHORT);
    this.metrics.movingAverages.short = shortPrices.reduce((sum, point) => sum + point.price, 0) / shortPrices.length;

    // Calculate long MA (50-hour)
    const longPrices = this.priceHistory.slice(-TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.MA_PERIODS.LONG);
    this.metrics.movingAverages.long = longPrices.reduce((sum, point) => sum + point.price, 0) / longPrices.length;
  }

  private calculateMACD(): void {
    if (this.priceHistory.length < 26) return;

    // Calculate 12-day EMA
    const ema12 = this.calculateEMA(12);

    // Calculate 26-day EMA
    const ema26 = this.calculateEMA(26);

    // Calculate MACD line
    const macdLine = ema12 - ema26;

    // Calculate signal line (9-day EMA of MACD line)
    this.macdSignal = this.macdSignal * 0.8 + macdLine * 0.2;

    // Calculate histogram
    this.macdHistogram = macdLine - this.macdSignal;

    // Update metrics
    this.metrics.macd = {
      signal: this.macdSignal,
      histogram: this.macdHistogram
    };
  }

  private calculateEMA(periods: number): number {
    const prices = this.priceHistory.slice(-periods).map(p => p.price);
    const multiplier = 2 / (periods + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  private async adjustRSI(shouldIncrease: boolean): Promise<void> {
    const baseAmount = TRADING_CONSTANTS.SAFETY.MAX_SINGLE_TRADE_SOL / 4;
    const tradeAmount = baseAmount * (1 + (Math.random() * 0.1));

    await this.executeTrade(tradeAmount, shouldIncrease);
  }

  private calculateMADeviation(): number {
    if (this.metrics.movingAverages.short === 0) return 0;
    return ((this.metrics.price - this.metrics.movingAverages.short) / this.metrics.movingAverages.short) * 100;
  }

  private async adjustPriceToMA(): Promise<void> {
    const targetPrice = this.metrics.movingAverages.short * 
      (1 + (TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.PRICE_ABOVE_20MA_PERCENT / 100));
    
    if (this.metrics.price < targetPrice) {
      const baseAmount = TRADING_CONSTANTS.SAFETY.MAX_SINGLE_TRADE_SOL / 3;
      await this.executeTrade(baseAmount, true);
    }
  }

  private async engineerMACDCrossover(): Promise<void> {
    // Prepare for crossover by increasing volume
    const volumeIncreaseTime = TRADING_CONSTANTS.TECHNICAL.MACD.VOLUME_INCREASE_BEFORE_HOURS * 60 * 60 * 1000;
    
    if (Date.now() - this.lastMACDCrossover >= volumeIncreaseTime) {
      // Execute trades from multiple wallets
      for (let i = 0; i < TRADING_CONSTANTS.TECHNICAL.MACD.ACTIVE_WALLETS; i++) {
        const tradeAmount = TRADING_CONSTANTS.SAFETY.MAX_SINGLE_TRADE_SOL / 
          TRADING_CONSTANTS.TECHNICAL.MACD.ACTIVE_WALLETS;
        
        await this.executeTrade(tradeAmount, true);
        await this.sleep(5000); // 5-second delay between trades
      }

      this.lastMACDCrossover = Date.now();
    }
  }
} 