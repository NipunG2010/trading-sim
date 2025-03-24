import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';

interface TradeInfo {
  price: number;
  volume: number;
  timestamp: number;
  isWhale: boolean;
}

interface TokenMetrics {
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  whaleActivity: number;
  lastUpdate: number;
  movingAverages: {
    ma5: number;
    ma20: number;
    ma50: number;
  };
}

export class TokenMetricsService extends EventEmitter {
  private connection: Connection;
  private tokenMint: PublicKey;
  private trades: TradeInfo[] = [];
  private metrics: TokenMetrics;
  private readonly PRICE_UPDATE_INTERVAL = 5000; // 5 seconds
  private readonly METRICS_UPDATE_INTERVAL = 15000; // 15 seconds
  private readonly TRADE_HISTORY_LIMIT = 1000; // Keep last 1000 trades

  constructor(connection: Connection, tokenMint: PublicKey) {
    super();
    this.connection = connection;
    this.tokenMint = tokenMint;
    this.metrics = this.initializeMetrics();
    this.startMonitoring();
  }

  private initializeMetrics(): TokenMetrics {
    return {
      currentPrice: 0,
      priceChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      whaleActivity: 0,
      lastUpdate: Date.now(),
      movingAverages: {
        ma5: 0,
        ma20: 0,
        ma50: 0
      }
    };
  }

  private startMonitoring(): void {
    // Update price frequently
    setInterval(() => this.updatePrice(), this.PRICE_UPDATE_INTERVAL);
    
    // Update comprehensive metrics less frequently
    setInterval(() => this.updateMetrics(), this.METRICS_UPDATE_INTERVAL);
    
    // Subscribe to program events for real-time updates
    this.subscribeToTradeEvents();
  }

  private async updatePrice(): Promise<void> {
    try {
      // Get recent trades
      const recentTrades = this.trades.slice(-5);
      if (recentTrades.length === 0) return;

      // Calculate VWAP (Volume Weighted Average Price)
      const vwap = recentTrades.reduce((acc, trade) => {
        return acc + (trade.price * trade.volume);
      }, 0) / recentTrades.reduce((acc, trade) => acc + trade.volume, 0);

      this.metrics.currentPrice = vwap;
      this.emit('priceUpdate', this.metrics.currentPrice);
    } catch (error) {
      console.error('Error updating price:', error);
    }
  }

  private async updateMetrics(): Promise<void> {
    try {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      // Filter trades in last 24h
      const trades24h = this.trades.filter(t => t.timestamp > oneDayAgo);

      // Calculate 24h metrics
      this.metrics.volume24h = trades24h.reduce((acc, t) => acc + t.volume, 0);
      this.metrics.whaleActivity = trades24h.filter(t => t.isWhale).length;

      // Calculate price change
      const oldestPrice = trades24h[0]?.price || this.metrics.currentPrice;
      this.metrics.priceChange24h = ((this.metrics.currentPrice - oldestPrice) / oldestPrice) * 100;

      // Calculate moving averages
      this.updateMovingAverages();

      // Update liquidity (you'll need to implement this based on your DEX integration)
      await this.updateLiquidity();

      this.metrics.lastUpdate = now;
      this.emit('metricsUpdate', this.metrics);
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  private updateMovingAverages(): void {
    const calculateMA = (period: number) => {
      const relevantTrades = this.trades.slice(-period);
      if (relevantTrades.length === 0) return 0;
      return relevantTrades.reduce((acc, t) => acc + t.price, 0) / relevantTrades.length;
    };

    this.metrics.movingAverages = {
      ma5: calculateMA(5),
      ma20: calculateMA(20),
      ma50: calculateMA(50)
    };
  }

  private async updateLiquidity(): Promise<void> {
    try {
      // Implement liquidity calculation based on your DEX integration
      // This is a placeholder - implement actual DEX pool checking
      const poolInfo = await this.connection.getTokenAccountBalance(this.tokenMint);
      this.metrics.liquidity = poolInfo.value.uiAmount || 0;
    } catch (error) {
      console.error('Error updating liquidity:', error);
    }
  }

  private async subscribeToTradeEvents(): Promise<void> {
    // Subscribe to program events for real-time trade updates
    this.connection.onProgramAccountChange(
      this.tokenMint,
      async (accountInfo) => {
        // Parse the account data and extract trade information
        // This is a placeholder - implement actual trade event parsing
        const tradeInfo: TradeInfo = {
          price: 0, // Extract from event
          volume: 0, // Extract from event
          timestamp: Date.now(),
          isWhale: false // Determine based on volume
        };

        this.addTrade(tradeInfo);
      }
    );
  }

  private addTrade(trade: TradeInfo): void {
    this.trades.push(trade);
    if (this.trades.length > this.TRADE_HISTORY_LIMIT) {
      this.trades.shift(); // Remove oldest trade
    }
    this.emit('newTrade', trade);
  }

  // Public methods for external access
  public getMetrics(): TokenMetrics {
    return { ...this.metrics };
  }

  public getRecentTrades(count: number = 10): TradeInfo[] {
    return this.trades.slice(-count);
  }

  public getPriceHistory(timeframe: '1h' | '24h' | '7d'): { timestamp: number; price: number }[] {
    const now = Date.now();
    const timeframes = {
      '1h': now - 60 * 60 * 1000,
      '24h': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000
    };

    return this.trades
      .filter(t => t.timestamp > timeframes[timeframe])
      .map(t => ({
        timestamp: t.timestamp,
        price: t.price
      }));
  }
} 