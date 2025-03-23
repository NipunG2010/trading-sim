import { Connection, PublicKey } from '@solana/web3.js';
import { MarketMetrics } from '../types/StrategyTypes';

type MarketDataCallback = (metrics: MarketMetrics) => void;

export class MarketDataService {
  private connection: Connection;
  private targetToken: PublicKey;
  private subscribers: Set<MarketDataCallback> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private lastMetrics: MarketMetrics = {
    price: 0,
    volume24h: 0,
    liquidityUSD: 0,
    rsi: 0,
    macd: { signal: 0, histogram: 0 },
    movingAverages: { short: 0, long: 0 }
  };

  constructor(connection: Connection, targetToken: PublicKey) {
    this.connection = connection;
    this.targetToken = targetToken;
  }

  async start(): Promise<void> {
    if (this.updateInterval) {
      return;
    }

    // Initial update
    await this.updateMarketData();

    // Start periodic updates (every 5 seconds)
    this.updateInterval = setInterval(async () => {
      await this.updateMarketData();
    }, 5000);
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  subscribe(callback: MarketDataCallback): void {
    this.subscribers.add(callback);
    // Immediately send current data to new subscriber
    callback(this.lastMetrics);
  }

  unsubscribe(callback: MarketDataCallback): void {
    this.subscribers.delete(callback);
  }

  private async updateMarketData(): Promise<void> {
    try {
      // Here you would integrate with Birdeye API or other data provider
      // For now, we'll simulate the data updates
      await this.fetchPriceData();
      await this.fetchVolumeData();
      await this.fetchLiquidityData();

      // Notify all subscribers
      this.notifySubscribers();
    } catch (error) {
      console.error('Error updating market data:', error);
    }
  }

  private async fetchPriceData(): Promise<void> {
    try {
      // Simulate price movement
      const randomChange = (Math.random() - 0.5) * 0.002; // ±0.1% change
      this.lastMetrics.price *= (1 + randomChange);
      
      if (this.lastMetrics.price === 0) {
        this.lastMetrics.price = 1; // Initial price if not set
      }
    } catch (error) {
      console.error('Error fetching price data:', error);
    }
  }

  private async fetchVolumeData(): Promise<void> {
    try {
      // Simulate volume updates
      const baseVolume = this.lastMetrics.volume24h || 1000;
      const volumeChange = (Math.random() - 0.3) * baseVolume * 0.1;
      this.lastMetrics.volume24h = Math.max(0, baseVolume + volumeChange);
    } catch (error) {
      console.error('Error fetching volume data:', error);
    }
  }

  private async fetchLiquidityData(): Promise<void> {
    try {
      // Simulate liquidity updates
      const baseLiquidity = this.lastMetrics.liquidityUSD || 10000;
      const liquidityChange = (Math.random() - 0.5) * baseLiquidity * 0.05;
      this.lastMetrics.liquidityUSD = Math.max(0, baseLiquidity + liquidityChange);
    } catch (error) {
      console.error('Error fetching liquidity data:', error);
    }
  }

  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      try {
        callback(this.lastMetrics);
      } catch (error) {
        console.error('Error in market data subscriber:', error);
      }
    }
  }

  // Helper method to manually update metrics (useful for testing)
  updateMetrics(metrics: Partial<MarketMetrics>): void {
    this.lastMetrics = {
      ...this.lastMetrics,
      ...metrics
    };
    this.notifySubscribers();
  }
} 