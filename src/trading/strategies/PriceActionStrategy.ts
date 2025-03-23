import { Connection } from '@solana/web3.js';
import { BaseStrategy } from './base/BaseStrategy';
import { TradeExecutionResult } from '../types/StrategyTypes';
import { TRADING_CONSTANTS } from '../constants/TradingConstants';

export class PriceActionStrategy extends BaseStrategy {
  private cycleCount: number = 0;
  private isUpward: boolean = true;
  private cycleStartPrice: number = 0;
  private lastActionTime: number = 0;
  private highestPrice: number = 0;

  constructor(connection: Connection) {
    super(connection);
  }

  async execute(): Promise<void> {
    this.isActive = true;
    this.currentPhase = 'executing';
    this.cycleStartPrice = this.metrics.price;
    this.highestPrice = this.metrics.price;

    try {
      while (this.isActive && this.cycleCount < TRADING_CONSTANTS.PRICE.STAIR_STEPS.CYCLES) {
        await this.managePriceAction();
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

      // Update metrics
      this.updatePriceMetrics(this.metrics.price * (isBuy ? 1.001 : 0.999));

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
    throw new Error('Liquidity management not supported in PriceActionStrategy');
  }

  private async managePriceAction(): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastAction = currentTime - this.lastActionTime;
    
    // Ensure minimum time between actions
    if (timeSinceLastAction < TRADING_CONSTANTS.SAFETY.MIN_TIME_BETWEEN_TRADES_MS) {
      return;
    }

    if (this.isUpward) {
      // Upward movement
      const targetPrice = this.cycleStartPrice * (1 + (TRADING_CONSTANTS.PRICE.STAIR_STEPS.UP_PERCENT / 100));
      if (this.metrics.price < targetPrice) {
        await this.movePrice(true);
      } else {
        this.isUpward = false;
        this.highestPrice = Math.max(this.highestPrice, this.metrics.price);
      }
    } else {
      // Downward movement (retracement)
      const retracementTarget = this.highestPrice * (1 - (TRADING_CONSTANTS.PRICE.STAIR_STEPS.DOWN_PERCENT / 100));
      if (this.metrics.price > retracementTarget) {
        await this.movePrice(false);
      } else {
        // Complete one cycle
        this.cycleCount++;
        this.isUpward = true;
        this.cycleStartPrice = this.metrics.price;
        this.currentPhase = `cycle_${this.cycleCount}`;
      }
    }

    this.lastActionTime = currentTime;
  }

  private async movePrice(isUp: boolean): Promise<void> {
    // Calculate trade size based on current price and desired movement
    const priceImpactPercent = isUp ? 0.1 : 0.05; // Smaller sells for more natural movement
    const baseAmount = TRADING_CONSTANTS.SAFETY.MAX_SINGLE_TRADE_SOL / 2;
    const tradeAmount = baseAmount * (1 + (Math.random() * 0.2)); // Add some randomness

    await this.executeTrade(tradeAmount, isUp);
  }

  private updatePriceMetrics(newPrice: number): void {
    this.metrics.price = newPrice;
    this.highestPrice = Math.max(this.highestPrice, newPrice);

    // Calculate overall progress
    const totalIncrease = ((newPrice - this.cycleStartPrice) / this.cycleStartPrice) * 100;
    if (totalIncrease >= TRADING_CONSTANTS.PRICE.TARGET_INCREASE_PERCENT) {
      this.isActive = false;
      this.currentPhase = 'target_reached';
    }
  }

  onPriceChange(newPrice: number): void {
    super.onPriceChange(newPrice);
    this.updatePriceMetrics(newPrice);
  }
} 