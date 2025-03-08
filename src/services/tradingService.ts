import { Connection } from '@solana/web3.js';

// Trading pattern types
export type TradingPatternType = 
  | 'moving_average' 
  | 'fibonacci' 
  | 'bollinger' 
  | 'volume_pattern'
  | 'organic'
  | 'macd'
  | 'rsi';

// Trading pattern configuration
export interface TradingPatternConfig {
  type: TradingPatternType;
  duration: number; // in minutes
  intensity: number; // 1-10 scale
}

// Trading data point
export interface TradingDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  tradeCount: number;
  whalePercentage: number;
}

// Trading status
export interface TradingStatus {
  isRunning: boolean;
  currentPattern: TradingPatternType | null;
  remainingTime: number | null;
  startTime: number | null;
  totalDuration: number | null;
}

// Wallet type
export interface WalletSummary {
  type: 'whale' | 'retail';
  count: number;
  totalBalance: number;
  percentageOfSupply: number;
}

// Token transaction
export interface TokenTransaction {
  timestamp: number;
  sender: string;
  receiver: string;
  amount: number;
  isWhale: boolean;
  signature: string;
}

/**
 * Trading Service
 * 
 * This service provides methods to interact with the trading engine.
 * In a real implementation, this would make API calls to a backend server.
 * For now, it simulates the behavior with mock data.
 */
export class TradingService {
  private connection: Connection;
  private tokenMint: string;
  private mockStatus: TradingStatus = {
    isRunning: false,
    currentPattern: null,
    remainingTime: null,
    startTime: null,
    totalDuration: null
  };
  private mockInterval: NodeJS.Timeout | null = null;
  private mockData: TradingDataPoint[] = [];
  private mockTransactions: TokenTransaction[] = [];
  
  constructor(connection: Connection, tokenMint: string) {
    this.connection = connection;
    this.tokenMint = tokenMint;
    this.initMockData();
  }
  
  /**
   * Initialize mock trading data
   */
  private initMockData(): void {
    const now = Date.now();
    this.mockData = [];
    this.mockTransactions = [];
    
    // Generate 24 hours of mock data
    for (let i = 0; i < 24; i++) {
      const timestamp = now - (24 - i) * 60 * 60 * 1000;
      const price = 0.1 + Math.random() * 0.05; // Random price between 0.1 and 0.15
      const volume = 10000 + Math.random() * 50000; // Random volume between 10k and 60k
      const tradeCount = Math.floor(20 + Math.random() * 80); // Random trades between 20 and 100
      const whalePercentage = 0.3 + Math.random() * 0.4; // Random whale percentage between 30% and 70%
      
      this.mockData.push({ timestamp, price, volume, tradeCount, whalePercentage });
      
      // Generate some mock transactions
      for (let j = 0; j < 5; j++) {
        const txTimestamp = timestamp + j * 10 * 60 * 1000; // 10 minutes apart
        const isWhale = Math.random() < 0.4;
        const amount = isWhale ? 
          10000 + Math.random() * 90000 : // Whale: 10k-100k
          1000 + Math.random() * 9000;    // Retail: 1k-10k
          
        this.mockTransactions.push({
          timestamp: txTimestamp,
          sender: `${isWhale ? 'Whale' : 'Retail'}_${Math.floor(Math.random() * 20)}`,
          receiver: `${Math.random() < 0.5 ? 'Whale' : 'Retail'}_${Math.floor(Math.random() * 20)}`,
          amount,
          isWhale,
          signature: `mock_signature_${Math.random().toString(36).substring(2, 15)}`
        });
      }
    }
  }
  
  /**
   * Get available trading patterns
   */
  public async getAvailablePatterns(): Promise<Array<{
    id: TradingPatternType;
    name: string;
    description: string;
    defaultDuration: number;
    defaultIntensity: number;
  }>> {
    // In a real implementation, this would fetch from the backend
    return [
      { 
        id: 'moving_average', 
        name: 'Moving Average Crossover', 
        description: 'Simulates price movement based on short and long moving average crossovers', 
        defaultDuration: 30, 
        defaultIntensity: 7 
      },
      { 
        id: 'fibonacci', 
        name: 'Fibonacci Retracement', 
        description: 'Simulates price movement based on Fibonacci retracement levels', 
        defaultDuration: 45, 
        defaultIntensity: 6 
      },
      { 
        id: 'bollinger', 
        name: 'Bollinger Band Squeeze', 
        description: 'Simulates price movement based on Bollinger Band contractions and expansions', 
        defaultDuration: 40, 
        defaultIntensity: 8 
      },
      { 
        id: 'volume_pattern', 
        name: 'Volume Pattern Engineering', 
        description: 'Simulates accumulation/distribution models, VWAP support/resistance, and OBV trends', 
        defaultDuration: 35, 
        defaultIntensity: 7 
      },
      { 
        id: 'organic', 
        name: 'Organic Activity Simulation', 
        description: 'Simulates natural trading with randomized microtransactions and stepping patterns', 
        defaultDuration: 50, 
        defaultIntensity: 5 
      },
      { 
        id: 'macd', 
        name: 'MACD Crossover Signal', 
        description: 'Simulates price movement based on MACD line crossing the signal line', 
        defaultDuration: 40, 
        defaultIntensity: 7 
      },
      { 
        id: 'rsi', 
        name: 'RSI Divergence', 
        description: 'Simulates price movement based on RSI divergence signals', 
        defaultDuration: 45, 
        defaultIntensity: 6 
      }
    ];
  }
  
  /**
   * Get trading data
   */
  public async getTradingData(): Promise<TradingDataPoint[]> {
    // In a real implementation, this would fetch from the backend
    return this.mockData;
  }
  
  /**
   * Get recent transactions
   */
  public async getRecentTransactions(limit: number = 20): Promise<TokenTransaction[]> {
    // In a real implementation, this would fetch from the backend
    return this.mockTransactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  /**
   * Get wallet summary
   */
  public async getWalletSummary(): Promise<WalletSummary[]> {
    // In a real implementation, this would fetch from the backend
    return [
      {
        type: 'whale',
        count: 20,
        totalBalance: 600000000,
        percentageOfSupply: 0.6
      },
      {
        type: 'retail',
        count: 30,
        totalBalance: 400000000,
        percentageOfSupply: 0.4
      }
    ];
  }
  
  /**
   * Get trading status
   */
  public async getTradingStatus(): Promise<TradingStatus> {
    // In a real implementation, this would fetch from the backend
    return this.mockStatus;
  }
  
  /**
   * Start trading
   */
  public async startTrading(pattern: TradingPatternConfig): Promise<boolean> {
    // In a real implementation, this would make an API call to start trading
    console.log(`Starting trading with pattern: ${pattern.type}, duration: ${pattern.duration} minutes, intensity: ${pattern.intensity}`);
    
    // Clear any existing interval
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }
    
    // Set up mock status
    const startTime = Date.now();
    const totalDuration = pattern.duration * 60 * 1000; // Convert minutes to milliseconds
    
    this.mockStatus = {
      isRunning: true,
      currentPattern: pattern.type,
      remainingTime: totalDuration,
      startTime,
      totalDuration
    };
    
    // Set up interval to update mock data and status
    this.mockInterval = setInterval(() => {
      // Update remaining time
      if (this.mockStatus.remainingTime !== null && this.mockStatus.remainingTime > 0) {
        this.mockStatus.remainingTime = Math.max(0, this.mockStatus.remainingTime - 1000);
      } else {
        // Trading finished
        this.mockStatus = {
          isRunning: false,
          currentPattern: null,
          remainingTime: null,
          startTime: null,
          totalDuration: null
        };
        
        if (this.mockInterval) {
          clearInterval(this.mockInterval);
          this.mockInterval = null;
        }
        
        return;
      }
      
      // Add new data point
      const lastPoint = this.mockData[this.mockData.length - 1];
      let newPrice = lastPoint.price;
      let newVolume = lastPoint.volume;
      let newTradeCount = lastPoint.tradeCount;
      let newWhalePercentage = lastPoint.whalePercentage;
      
      // Adjust price based on pattern
      switch (pattern.type) {
        case 'moving_average':
          // Simulate moving average crossover
          if (Math.random() < 0.1) {
            // Crossover event
            newPrice = lastPoint.price * (1 + (Math.random() * 0.05 - 0.02) * pattern.intensity / 5);
            newVolume = lastPoint.volume * (1 + Math.random() * 0.2 * pattern.intensity / 5);
            newTradeCount = Math.floor(lastPoint.tradeCount * (1 + Math.random() * 0.3));
            newWhalePercentage = 0.4 + Math.random() * 0.3;
          } else {
            // Normal movement
            newPrice = lastPoint.price * (1 + (Math.random() * 0.02 - 0.01));
            newVolume = lastPoint.volume * (0.9 + Math.random() * 0.2);
            newTradeCount = Math.floor(lastPoint.tradeCount * (0.8 + Math.random() * 0.4));
            newWhalePercentage = lastPoint.whalePercentage * (0.9 + Math.random() * 0.2);
          }
          break;
          
        case 'fibonacci':
          // Simulate fibonacci retracement
          if (Math.random() < 0.15) {
            // Retracement level reached
            newPrice = lastPoint.price * (1 + (Math.random() * 0.04 - 0.02) * pattern.intensity / 5);
            newVolume = lastPoint.volume * (1 + Math.random() * 0.15 * pattern.intensity / 5);
            newTradeCount = Math.floor(lastPoint.tradeCount * (1 + Math.random() * 0.25));
            newWhalePercentage = 0.35 + Math.random() * 0.3;
          } else {
            // Normal movement
            newPrice = lastPoint.price * (1 + (Math.random() * 0.015 - 0.0075));
            newVolume = lastPoint.volume * (0.92 + Math.random() * 0.16);
            newTradeCount = Math.floor(lastPoint.tradeCount * (0.85 + Math.random() * 0.3));
            newWhalePercentage = lastPoint.whalePercentage * (0.95 + Math.random() * 0.1);
          }
          break;
          
        case 'bollinger':
          // Simulate bollinger band squeeze
          if (Math.random() < 0.05) {
            // Breakout
            const direction = Math.random() < 0.6 ? 1 : -1; // Bias toward upward breakouts
            newPrice = lastPoint.price * (1 + direction * Math.random() * 0.08 * pattern.intensity / 5);
            newVolume = lastPoint.volume * (1.2 + Math.random() * 0.4 * pattern.intensity / 5);
            newTradeCount = Math.floor(lastPoint.tradeCount * (1.3 + Math.random() * 0.5));
            newWhalePercentage = 0.5 + Math.random() * 0.3;
          } else {
            // Consolidation
            newPrice = lastPoint.price * (1 + (Math.random() * 0.01 - 0.005));
            newVolume = lastPoint.volume * (0.85 + Math.random() * 0.3);
            newTradeCount = Math.floor(lastPoint.tradeCount * (0.7 + Math.random() * 0.6));
            newWhalePercentage = lastPoint.whalePercentage * (0.9 + Math.random() * 0.2);
          }
          break;
          
        case 'volume_pattern':
          // Simulate volume pattern
          if (Math.random() < 0.2) {
            // Volume spike
            newPrice = lastPoint.price * (1 + (Math.random() * 0.03 - 0.01) * pattern.intensity / 5);
            newVolume = lastPoint.volume * (1.3 + Math.random() * 0.5 * pattern.intensity / 5);
            newTradeCount = Math.floor(lastPoint.tradeCount * (1.2 + Math.random() * 0.4));
            newWhalePercentage = 0.6 + Math.random() * 0.2;
          } else {
            // Normal movement
            newPrice = lastPoint.price * (1 + (Math.random() * 0.012 - 0.006));
            newVolume = lastPoint.volume * (0.9 + Math.random() * 0.2);
            newTradeCount = Math.floor(lastPoint.tradeCount * (0.8 + Math.random() * 0.4));
            newWhalePercentage = lastPoint.whalePercentage * (0.95 + Math.random() * 0.1);
          }
          break;
          
        case 'organic':
          // Simulate organic activity
          newPrice = lastPoint.price * (1 + (Math.random() * 0.016 - 0.008) * pattern.intensity / 5);
          newVolume = lastPoint.volume * (0.95 + Math.random() * 0.1 * pattern.intensity / 5);
          newTradeCount = Math.floor(lastPoint.tradeCount * (0.9 + Math.random() * 0.2));
          newWhalePercentage = lastPoint.whalePercentage * (0.98 + Math.random() * 0.04);
          break;
          
        case 'macd':
          // Simulate MACD crossover
          if (Math.random() < 0.08) {
            // Crossover event
            const direction = Math.random() < 0.55 ? 1 : -1; // Slight bias toward bullish
            newPrice = lastPoint.price * (1 + direction * Math.random() * 0.06 * pattern.intensity / 5);
            newVolume = lastPoint.volume * (1.1 + Math.random() * 0.3 * pattern.intensity / 5);
            newTradeCount = Math.floor(lastPoint.tradeCount * (1.1 + Math.random() * 0.4));
            newWhalePercentage = 0.45 + Math.random() * 0.25;
          } else {
            // Normal movement
            newPrice = lastPoint.price * (1 + (Math.random() * 0.014 - 0.007));
            newVolume = lastPoint.volume * (0.9 + Math.random() * 0.2);
            newTradeCount = Math.floor(lastPoint.tradeCount * (0.85 + Math.random() * 0.3));
            newWhalePercentage = lastPoint.whalePercentage * (0.95 + Math.random() * 0.1);
          }
          break;
          
        case 'rsi':
          // Simulate RSI divergence
          if (Math.random() < 0.1) {
            // Divergence event
            const direction = Math.random() < 0.5 ? 1 : -1;
            newPrice = lastPoint.price * (1 + direction * Math.random() * 0.07 * pattern.intensity / 5);
            newVolume = lastPoint.volume * (1.15 + Math.random() * 0.35 * pattern.intensity / 5);
            newTradeCount = Math.floor(lastPoint.tradeCount * (1.2 + Math.random() * 0.3));
            newWhalePercentage = 0.5 + Math.random() * 0.2;
          } else {
            // Normal movement
            newPrice = lastPoint.price * (1 + (Math.random() * 0.013 - 0.0065));
            newVolume = lastPoint.volume * (0.92 + Math.random() * 0.16);
            newTradeCount = Math.floor(lastPoint.tradeCount * (0.88 + Math.random() * 0.24));
            newWhalePercentage = lastPoint.whalePercentage * (0.96 + Math.random() * 0.08);
          }
          break;
      }
      
      // Ensure values are reasonable
      newPrice = Math.max(0.01, newPrice);
      newVolume = Math.max(1000, newVolume);
      newTradeCount = Math.max(5, newTradeCount);
      newWhalePercentage = Math.min(0.9, Math.max(0.1, newWhalePercentage));
      
      // Add new data point
      this.mockData.push({
        timestamp: Date.now(),
        price: newPrice,
        volume: newVolume,
        tradeCount: newTradeCount,
        whalePercentage: newWhalePercentage
      });
      
      // Keep only the last 100 data points
      if (this.mockData.length > 100) {
        this.mockData = this.mockData.slice(-100);
      }
      
      // Add new mock transaction
      const isWhale = Math.random() < newWhalePercentage;
      const amount = isWhale ? 
        10000 + Math.random() * 90000 : // Whale: 10k-100k
        1000 + Math.random() * 9000;    // Retail: 1k-10k
        
      this.mockTransactions.push({
        timestamp: Date.now(),
        sender: `${isWhale ? 'Whale' : 'Retail'}_${Math.floor(Math.random() * 20)}`,
        receiver: `${Math.random() < 0.5 ? 'Whale' : 'Retail'}_${Math.floor(Math.random() * 20)}`,
        amount,
        isWhale,
        signature: `mock_signature_${Math.random().toString(36).substring(2, 15)}`
      });
      
      // Keep only the last 100 transactions
      if (this.mockTransactions.length > 100) {
        this.mockTransactions = this.mockTransactions.slice(-100);
      }
    }, 1000);
    
    return true;
  }
  
  /**
   * Stop trading
   */
  public async stopTrading(): Promise<boolean> {
    // In a real implementation, this would make an API call to stop trading
    console.log('Stopping trading');
    
    // Clear interval
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    
    // Reset status
    this.mockStatus = {
      isRunning: false,
      currentPattern: null,
      remainingTime: null,
      startTime: null,
      totalDuration: null
    };
    
    return true;
  }
  
  /**
   * Get token info
   */
  public async getTokenInfo(): Promise<{
    mint: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
  }> {
    // In a real implementation, this would fetch from the backend
    return {
      mint: this.tokenMint,
      name: 'Quantum Protocol',
      symbol: 'QP',
      decimals: 9,
      totalSupply: 1000000000
    };
  }
} 