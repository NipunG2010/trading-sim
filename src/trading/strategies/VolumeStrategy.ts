import { Connection } from '@solana/web3.js';
import { BaseStrategy } from './base/BaseStrategy';
import { TradeExecutionResult } from '../types/StrategyTypes';
import { TRADING_CONSTANTS } from '../constants/TradingConstants';

export class VolumeStrategy extends BaseStrategy {
  private dailyVolume: number = 0;
  private hourlyVolume: number = 0;
  private lastVolumeReset: number = Date.now();
  private consecutiveGrowthHours: number = 0;

  constructor(connection: Connection) {
    super(connection);
  }

  async execute(): Promise<void> {
    this.isActive = true;
    this.currentPhase = 'executing';

    try {
      while (this.isActive) {
        await this.manageVolume();
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

      // Update volume metrics
      this.updateVolume(amount);

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
    throw new Error('Liquidity management not supported in VolumeStrategy');
  }

  private async manageVolume(): Promise<void> {
    // Reset daily volume if 24 hours have passed
    if (Date.now() - this.lastVolumeReset >= 24 * 60 * 60 * 1000) {
      this.dailyVolume = 0;
      this.lastVolumeReset = Date.now();
      this.consecutiveGrowthHours = 0;
    }

    // Check if we're in a trading window
    if (!this.isInTradingWindow()) {
      this.currentPhase = 'waiting_for_window';
      return;
    }

    // Get target volume for current window
    const windowVolumeTarget = this.getWindowVolumeTarget();
    let targetHourlyVolume = (TRADING_CONSTANTS.VOLUME.INITIAL_DAILY_SOL * 
      (windowVolumeTarget / 100)) / 24;

    // Apply growth pattern if in consecutive growth hours
    if (this.consecutiveGrowthHours < TRADING_CONSTANTS.VOLUME.GROWTH_DURATION_HOURS) {
      targetHourlyVolume *= (1 + (TRADING_CONSTANTS.VOLUME.GROWTH_PERCENT / 100));
      this.consecutiveGrowthHours++;
    }

    // Calculate remaining volume needed this hour
    const volumeNeeded = Math.max(0, targetHourlyVolume - this.hourlyVolume);
    if (volumeNeeded <= 0) {
      this.currentPhase = 'waiting_next_hour';
      return;
    }

    // Split volume into buy/sell according to ratio
    const buyVolume = volumeNeeded * (TRADING_CONSTANTS.VOLUME.BUY_SELL_RATIO.BUY / 100);
    const sellVolume = volumeNeeded * (TRADING_CONSTANTS.VOLUME.BUY_SELL_RATIO.SELL / 100);

    // Execute trades
    if (buyVolume > 0) {
      await this.executeTrade(buyVolume, true);
    }
    if (sellVolume > 0) {
      await this.executeTrade(sellVolume, false);
    }
  }

  private updateVolume(amount: number): void {
    this.dailyVolume += amount;
    this.hourlyVolume += amount;
    this.metrics.volume24h = this.dailyVolume;

    // Reset hourly volume if an hour has passed
    const hoursSinceReset = (Date.now() - this.lastVolumeReset) / (60 * 60 * 1000);
    if (hoursSinceReset >= 1) {
      this.hourlyVolume = 0;
      this.lastVolumeReset = Date.now();
    }
  }
} 