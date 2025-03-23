import { Connection } from '@solana/web3.js';
import { BaseStrategy } from './base/BaseStrategy';
import { LiquidityStrategy } from './LiquidityStrategy';
import { VolumeStrategy } from './VolumeStrategy';
import { PriceActionStrategy } from './PriceActionStrategy';
import { TechnicalStrategy } from './TechnicalStrategy';
import { TradeExecutionResult, StrategyConfig } from '../types/StrategyTypes';
import { TRADING_CONSTANTS } from '../constants/TradingConstants';

export class TimingStrategy extends BaseStrategy {
  private strategies: {
    liquidity: LiquidityStrategy;
    volume: VolumeStrategy;
    priceAction: PriceActionStrategy;
    technical: TechnicalStrategy;
  };

  private activeStrategies: Set<string> = new Set();
  private lastWindowCheck: number = 0;
  private executionStartTime: number = 0;

  constructor(connection: Connection) {
    super(connection);
    this.strategies = {
      liquidity: new LiquidityStrategy(connection),
      volume: new VolumeStrategy(connection),
      priceAction: new PriceActionStrategy(connection),
      technical: new TechnicalStrategy(connection)
    };
  }

  async initialize(config: StrategyConfig): Promise<boolean> {
    await super.initialize(config);
    
    // Initialize all sub-strategies
    await Promise.all([
      this.strategies.liquidity.initialize(config),
      this.strategies.volume.initialize(config),
      this.strategies.priceAction.initialize(config),
      this.strategies.technical.initialize(config)
    ]);

    this.executionStartTime = Date.now();
    return true;
  }

  async execute(): Promise<void> {
    this.isActive = true;
    this.currentPhase = 'executing';

    try {
      // Start with liquidity setup
      await this.executePhase('initial_liquidity', async () => {
        await this.strategies.liquidity.execute();
      });

      // Main trading loop
      while (this.isActive) {
        await this.manageTrading();
        await this.sleep(TRADING_CONSTANTS.SAFETY.MIN_TIME_BETWEEN_TRADES_MS);

        // Check if we've reached the target duration (48 hours)
        if (Date.now() - this.executionStartTime >= 48 * 60 * 60 * 1000) {
          this.isActive = false;
          this.currentPhase = 'completed';
        }
      }
    } catch (error) {
      this.onError(error as Error);
    }
  }

  async executeTrade(amount: number, isBuy: boolean): Promise<TradeExecutionResult> {
    // Delegate to volume strategy for trade execution
    return this.strategies.volume.executeTrade(amount, isBuy);
  }

  async adjustLiquidity(amount: number, isAdd: boolean): Promise<TradeExecutionResult> {
    // Delegate to liquidity strategy for liquidity management
    return this.strategies.liquidity.adjustLiquidity(amount, isAdd);
  }

  private async manageTrading(): Promise<void> {
    const currentTime = Date.now();
    const currentWindow = this.getCurrentTradingWindow();

    // Update active strategies based on trading window
    if (currentTime - this.lastWindowCheck >= 5 * 60 * 1000) { // Check every 5 minutes
      this.updateActiveStrategies(currentWindow);
      this.lastWindowCheck = currentTime;
    }

    // Execute active strategies
    await this.executeActiveStrategies();

    // Propagate market updates to all strategies
    this.updateStrategyMetrics();
  }

  private getCurrentTradingWindow(): string {
    const now = new Date();
    const utcHour = now.getUTCHours();

    const window = TRADING_CONSTANTS.TIME_WINDOWS.PEAK_WINDOWS.find(w => 
      utcHour >= w.start && utcHour < w.end
    );

    return window ? window.name : 'off_peak';
  }

  private updateActiveStrategies(window: string): void {
    this.activeStrategies.clear();

    // Liquidity strategy is always active
    this.activeStrategies.add('liquidity');

    if (window !== 'off_peak') {
      // During peak windows, all strategies are active
      this.activeStrategies.add('volume');
      this.activeStrategies.add('priceAction');
      this.activeStrategies.add('technical');
    } else {
      // During off-peak, maintain basic volume and technical monitoring
      this.activeStrategies.add('volume');
      this.activeStrategies.add('technical');
    }
  }

  private async executeActiveStrategies(): Promise<void> {
    const executePromises: Promise<void>[] = [];

    if (this.activeStrategies.has('volume')) {
      executePromises.push(this.executePhase('volume', async () => {
        await this.strategies.volume.execute();
      }));
    }

    if (this.activeStrategies.has('priceAction')) {
      executePromises.push(this.executePhase('price_action', async () => {
        await this.strategies.priceAction.execute();
      }));
    }

    if (this.activeStrategies.has('technical')) {
      executePromises.push(this.executePhase('technical', async () => {
        await this.strategies.technical.execute();
      }));
    }

    await Promise.all(executePromises);
  }

  private async executePhase(phase: string, execution: () => Promise<void>): Promise<void> {
    this.currentPhase = phase;
    try {
      await execution();
    } catch (error) {
      console.error(`Error in ${phase} phase:`, error);
      throw error;
    }
  }

  private updateStrategyMetrics(): void {
    // Propagate current metrics to all strategies
    const strategies = Object.values(this.strategies);
    for (const strategy of strategies) {
      strategy.onPriceChange(this.metrics.price);
      strategy.onVolumeChange(this.metrics.volume24h);
      strategy.onLiquidityChange(this.metrics.liquidityUSD);
    }
  }

  onPriceChange(newPrice: number): void {
    super.onPriceChange(newPrice);
    this.updateStrategyMetrics();
  }

  onVolumeChange(newVolume: number): void {
    super.onVolumeChange(newVolume);
    this.updateStrategyMetrics();
  }

  onLiquidityChange(newLiquidity: number): void {
    super.onLiquidityChange(newLiquidity);
    this.updateStrategyMetrics();
  }
} 