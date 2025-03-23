import { Connection, PublicKey } from '@solana/web3.js';
import { IStrategy } from './IStrategy';
import { StrategyStatus, StrategyConfig, TradeExecutionResult, MarketMetrics } from '../../types/StrategyTypes';
import { TRADING_CONSTANTS } from '../../constants/TradingConstants';

export abstract class BaseStrategy implements IStrategy {
  protected config!: StrategyConfig;
  protected connection: Connection;
  protected isActive: boolean = false;
  protected currentPhase: string = 'initialized';
  protected metrics: MarketMetrics;

  constructor(connection: Connection) {
    this.connection = connection;
    this.metrics = {
      price: 0,
      volume24h: 0,
      liquidityUSD: 0,
      rsi: 0,
      macd: { signal: 0, histogram: 0 },
      movingAverages: { short: 0, long: 0 }
    };
  }

  async initialize(config: StrategyConfig): Promise<boolean> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid strategy configuration');
    }
    this.config = config;
    return true;
  }

  abstract execute(): Promise<void>;

  async stop(): Promise<void> {
    this.isActive = false;
    this.currentPhase = 'stopped';
  }

  getStatus(): StrategyStatus {
    return {
      isActive: this.isActive,
      currentPhase: this.currentPhase,
      metrics: {
        price: this.metrics.price,
        volume24h: this.metrics.volume24h,
        liquidityUSD: this.metrics.liquidityUSD,
        rsi: this.metrics.rsi,
        macd: this.metrics.macd
      }
    };
  }

  async getMetrics(): Promise<MarketMetrics> {
    return this.metrics;
  }

  abstract executeTrade(amount: number, isBuy: boolean): Promise<TradeExecutionResult>;
  
  abstract adjustLiquidity(amount: number, isAdd: boolean): Promise<TradeExecutionResult>;

  validateConfig(config: StrategyConfig): boolean {
    if (!config.targetToken) return false;
    if (config.timeframe <= 0) return false;
    if (config.volumeTargets.daily <= 0 || config.volumeTargets.hourly <= 0) return false;
    if (config.priceTargets.min >= config.priceTargets.max) return false;
    if (config.liquidityRanges.min >= config.liquidityRanges.max) return false;
    return true;
  }

  async checkSafetyLimits(): Promise<boolean> {
    try {
      // Check minimum liquidity
      if (this.metrics.liquidityUSD < TRADING_CONSTANTS.SAFETY.MIN_LIQUIDITY_SOL) {
        return false;
      }

      // Check if price is within allowed range
      if (this.metrics.price < this.config.priceTargets.min || 
          this.metrics.price > this.config.priceTargets.max) {
        return false;
      }

      // Check RSI limits
      if (this.metrics.rsi > TRADING_CONSTANTS.TECHNICAL.RSI.ABSOLUTE_MAX) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking safety limits:', error);
      return false;
    }
  }

  onPriceChange(newPrice: number): void {
    this.metrics.price = newPrice;
  }

  onVolumeChange(newVolume: number): void {
    this.metrics.volume24h = newVolume;
  }

  onLiquidityChange(newLiquidity: number): void {
    this.metrics.liquidityUSD = newLiquidity;
  }

  onError(error: Error): void {
    console.error('Strategy error:', error);
    this.currentPhase = 'error';
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected isInTradingWindow(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    return TRADING_CONSTANTS.TIME_WINDOWS.PEAK_WINDOWS.some(window => 
      utcHour >= window.start && utcHour < window.end
    );
  }

  protected getWindowVolumeTarget(): number {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    const window = TRADING_CONSTANTS.TIME_WINDOWS.PEAK_WINDOWS.find(w => 
      utcHour >= w.start && utcHour < w.end
    );

    return window ? window.volumePercent : TRADING_CONSTANTS.TIME_WINDOWS.OTHER_HOURS_PERCENT;
  }
} 