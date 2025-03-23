import { Connection, PublicKey } from '@solana/web3.js';
import { BaseStrategy } from '../strategies/base/BaseStrategy';
import { LiquidityStrategy } from '../strategies/LiquidityStrategy';
import { VolumeStrategy } from '../strategies/VolumeStrategy';
import { PriceActionStrategy } from '../strategies/PriceActionStrategy';
import { TechnicalStrategy } from '../strategies/TechnicalStrategy';
import { TimingStrategy } from '../strategies/TimingStrategy';
import { StrategyConfig } from '../types/StrategyTypes';
import { MarketDataService } from '../services/MarketDataService';
import { TradingService } from '../services/TradingService';
import { WalletService } from '../services/WalletService';

export type StrategyType = 'liquidity' | 'volume' | 'priceAction' | 'technical' | 'timing';

export class StrategyFactory {
  private connection: Connection;
  private marketDataService: MarketDataService;
  private tradingService: TradingService;
  private walletService: WalletService;
  private activeStrategies: Map<string, BaseStrategy> = new Map();

  constructor(
    connection: Connection,
    targetToken: PublicKey
  ) {
    this.connection = connection;
    this.marketDataService = new MarketDataService(connection, targetToken);
    this.tradingService = new TradingService(connection, targetToken);
    this.walletService = new WalletService(connection);
  }

  async createStrategy(
    type: StrategyType,
    config: StrategyConfig,
    id: string = type
  ): Promise<BaseStrategy> {
    // Check if strategy with this ID already exists
    if (this.activeStrategies.has(id)) {
      throw new Error(`Strategy with ID ${id} already exists`);
    }

    let strategy: BaseStrategy;

    switch (type) {
      case 'liquidity':
        strategy = new LiquidityStrategy(this.connection);
        break;
      case 'volume':
        strategy = new VolumeStrategy(this.connection);
        break;
      case 'priceAction':
        strategy = new PriceActionStrategy(this.connection);
        break;
      case 'technical':
        strategy = new TechnicalStrategy(this.connection);
        break;
      case 'timing':
        strategy = new TimingStrategy(this.connection);
        break;
      default:
        throw new Error(`Unknown strategy type: ${type}`);
    }

    // Initialize the strategy
    await strategy.initialize(config);

    // Subscribe to market data updates
    this.marketDataService.subscribe((metrics) => {
      strategy.onPriceChange(metrics.price);
      strategy.onVolumeChange(metrics.volume24h);
      strategy.onLiquidityChange(metrics.liquidityUSD);
    });

    // Store the strategy
    this.activeStrategies.set(id, strategy);

    return strategy;
  }

  async createTimingStrategy(
    config: StrategyConfig,
    id: string = 'main'
  ): Promise<TimingStrategy> {
    const strategy = await this.createStrategy('timing', config, id) as TimingStrategy;
    return strategy;
  }

  getStrategy(id: string): BaseStrategy | undefined {
    return this.activeStrategies.get(id);
  }

  async stopStrategy(id: string): Promise<void> {
    const strategy = this.activeStrategies.get(id);
    if (strategy) {
      await strategy.stop();
      this.activeStrategies.delete(id);
    }
  }

  async stopAllStrategies(): Promise<void> {
    const stopPromises = Array.from(this.activeStrategies.values()).map(strategy => 
      strategy.stop()
    );
    await Promise.all(stopPromises);
    this.activeStrategies.clear();
  }

  getActiveStrategies(): Map<string, BaseStrategy> {
    return new Map(this.activeStrategies);
  }

  getMarketDataService(): MarketDataService {
    return this.marketDataService;
  }

  getTradingService(): TradingService {
    return this.tradingService;
  }

  getWalletService(): WalletService {
    return this.walletService;
  }

  // Helper method to start all required services
  async start(): Promise<void> {
    await this.marketDataService.start();
  }

  // Helper method to stop all services and strategies
  async stop(): Promise<void> {
    await this.stopAllStrategies();
    this.marketDataService.stop();
  }
} 