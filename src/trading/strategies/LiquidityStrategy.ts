import { Connection } from '@solana/web3.js';
import { BaseStrategy } from './base/BaseStrategy';
import { TradeExecutionResult } from '../types/StrategyTypes';
import { TRADING_CONSTANTS } from '../constants/TradingConstants';

export class LiquidityStrategy extends BaseStrategy {
  private lastPriceCheck: number = 0;
  private initialLiquidityAdded: boolean = false;

  constructor(connection: Connection) {
    super(connection);
  }

  async execute(): Promise<void> {
    this.isActive = true;
    this.currentPhase = 'executing';

    try {
      // Add initial liquidity if not done
      if (!this.initialLiquidityAdded) {
        await this.addInitialLiquidity();
      }

      // Main liquidity management loop
      while (this.isActive) {
        await this.manageLiquidity();
        await this.sleep(TRADING_CONSTANTS.SAFETY.MIN_TIME_BETWEEN_TRADES_MS);
      }
    } catch (error) {
      this.onError(error as Error);
    }
  }

  async executeTrade(amount: number, isBuy: boolean): Promise<TradeExecutionResult> {
    // This strategy doesn't execute regular trades
    throw new Error('Regular trading not supported in LiquidityStrategy');
  }

  async adjustLiquidity(amount: number, isAdd: boolean): Promise<TradeExecutionResult> {
    try {
      if (!await this.checkSafetyLimits()) {
        throw new Error('Safety limits exceeded');
      }

      // Here you would integrate with Jupiter or other DEX SDK to add/remove liquidity
      // For now, we'll simulate the result
      const result: TradeExecutionResult = {
        success: true,
        txId: 'simulated_tx_' + Date.now(),
        price: this.metrics.price,
        amount: amount,
        timestamp: Date.now()
      };

      // Update metrics
      this.metrics.liquidityUSD += isAdd ? amount : -amount;

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

  private async addInitialLiquidity(): Promise<void> {
    const amount = TRADING_CONSTANTS.LIQUIDITY.INITIAL_AMOUNT_SOL;
    const result = await this.adjustLiquidity(amount, true);
    
    if (result.success) {
      this.initialLiquidityAdded = true;
      console.log(`Initial liquidity of ${amount} SOL added successfully`);
    } else {
      throw new Error(`Failed to add initial liquidity: ${result.error}`);
    }
  }

  private async manageLiquidity(): Promise<void> {
    const currentPrice = this.metrics.price;
    const priceChange = this.lastPriceCheck > 0 
      ? ((currentPrice - this.lastPriceCheck) / this.lastPriceCheck) * 100 
      : 0;

    // Check for removal condition
    if (priceChange >= TRADING_CONSTANTS.LIQUIDITY.REMOVAL_THRESHOLD_PERCENT) {
      const removalAmount = this.metrics.liquidityUSD * 
        (TRADING_CONSTANTS.LIQUIDITY.REMOVAL_AMOUNT_PERCENT / 100);
      await this.adjustLiquidity(removalAmount, false);
    }
    // Check for add back condition
    else if (priceChange <= -TRADING_CONSTANTS.LIQUIDITY.DIP_THRESHOLD_PERCENT) {
      const addAmount = this.metrics.liquidityUSD * 
        (TRADING_CONSTANTS.LIQUIDITY.DIP_ADD_AMOUNT_PERCENT / 100);
      await this.adjustLiquidity(addAmount, true);
    }

    this.lastPriceCheck = currentPrice;
  }
} 