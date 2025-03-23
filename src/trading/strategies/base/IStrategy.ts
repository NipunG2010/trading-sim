import { StrategyStatus, StrategyConfig, TradeExecutionResult, MarketMetrics } from '../../types/StrategyTypes';

export interface IStrategy {
  // Core methods
  initialize(config: StrategyConfig): Promise<boolean>;
  execute(): Promise<void>;
  stop(): Promise<void>;
  
  // Status and metrics
  getStatus(): StrategyStatus;
  getMetrics(): Promise<MarketMetrics>;
  
  // Trading operations
  executeTrade(amount: number, isBuy: boolean): Promise<TradeExecutionResult>;
  adjustLiquidity(amount: number, isAdd: boolean): Promise<TradeExecutionResult>;
  
  // Safety checks
  validateConfig(config: StrategyConfig): boolean;
  checkSafetyLimits(): Promise<boolean>;
  
  // Event handlers
  onPriceChange(newPrice: number): void;
  onVolumeChange(newVolume: number): void;
  onLiquidityChange(newLiquidity: number): void;
  onError(error: Error): void;
} 