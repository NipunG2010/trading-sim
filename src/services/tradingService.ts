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

// Mock data generator
const generateMockData = (count: number): TradingDataPoint[] => {
  const data: TradingDataPoint[] = [];
  const now = Date.now();
  let price = 0.001;

  for (let i = 0; i < count; i++) {
    // Create some price volatility
    const priceChange = (Math.random() - 0.5) * 0.0002;
    price = Math.max(0.0001, price + priceChange);
    
    const dataPoint: TradingDataPoint = {
      timestamp: now - ((count - i) * 60000), // 1 minute intervals going back in time
      price,
      volume: Math.random() * 1000000,
      tradeCount: Math.floor(Math.random() * 100) + 1,
      whalePercentage: Math.random() * 100
    };
    
    data.push(dataPoint);
  }
  
  return data;
};

// Mock transaction generator
const generateMockTransactions = (count: number): TokenTransaction[] => {
  const transactions: TokenTransaction[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const isWhale = Math.random() > 0.7;
    
    const transaction: TokenTransaction = {
      timestamp: now - (Math.random() * 3600000), // Random time in the last hour
      sender: `Sender${Math.floor(Math.random() * 50) + 1}`.padEnd(43, '1'),
      receiver: `Receiver${Math.floor(Math.random() * 50) + 1}`.padEnd(43, '1'),
      amount: isWhale ? Math.random() * 1000000 : Math.random() * 10000,
      isWhale,
      signature: `Signature${Math.floor(Math.random() * 1000)}`.padEnd(64, '0')
    };
    
    transactions.push(transaction);
  }
  
  // Sort by timestamp descending (newest first)
  return transactions.sort((a, b) => b.timestamp - a.timestamp);
};

// Mock wallet summary
const generateMockWalletSummary = (): WalletSummary[] => {
  return [
    {
      type: 'whale',
      count: 20,
      totalBalance: 600000000,
      percentageOfSupply: 60
    },
    {
      type: 'retail',
      count: 30,
      totalBalance: 400000000,
      percentageOfSupply: 40
    }
  ];
};

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
    // Generate initial mock data for the past hour (60 data points, 1 per minute)
    this.mockData = generateMockData(60);
    this.mockTransactions = generateMockTransactions(20);
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
    return [
      {
        id: 'moving_average',
        name: 'Moving Average Crossover',
        description: 'Simulates moving average crossover signals for price action',
        defaultDuration: 60,
        defaultIntensity: 5
      },
      {
        id: 'fibonacci',
        name: 'Fibonacci Retracement',
        description: 'Implements Fibonacci retracement levels for support and resistance',
        defaultDuration: 120,
        defaultIntensity: 4
      },
      {
        id: 'bollinger',
        name: 'Bollinger Band Squeeze',
        description: 'Creates volatility based on Bollinger Band width',
        defaultDuration: 90,
        defaultIntensity: 7
      },
      {
        id: 'volume_pattern',
        name: 'Volume Pattern Engineering',
        description: 'Coordinates price movements with volume patterns',
        defaultDuration: 45,
        defaultIntensity: 6
      },
      {
        id: 'organic',
        name: 'Organic Activity Simulation',
        description: 'Creates natural-looking trading activity patterns',
        defaultDuration: 60,
        defaultIntensity: 3
      },
      {
        id: 'macd',
        name: 'MACD Crossover Signal',
        description: 'Simulates MACD line crossing the signal line',
        defaultDuration: 80,
        defaultIntensity: 5
      },
      {
        id: 'rsi',
        name: 'RSI Divergence',
        description: 'Creates price/RSI divergence signals',
        defaultDuration: 70,
        defaultIntensity: 6
      }
    ];
  }
  
  /**
   * Get trading data
   */
  public async getTradingData(): Promise<TradingDataPoint[]> {
    // Return a copy of the mock data
    return [...this.mockData];
  }
  
  /**
   * Get recent transactions
   */
  public async getRecentTransactions(limit: number = 20): Promise<TokenTransaction[]> {
    // Return a copy of the mock transactions
    return this.mockTransactions.slice(0, limit);
  }
  
  /**
   * Get wallet summary
   */
  public async getWalletSummary(): Promise<WalletSummary[]> {
    return generateMockWalletSummary();
  }
  
  /**
   * Get trading status
   */
  public async getTradingStatus(): Promise<TradingStatus> {
    return { ...this.mockStatus };
  }
  
  /**
   * Start trading
   */
  public async startTrading(pattern: TradingPatternConfig): Promise<boolean> {
    if (this.mockStatus.isRunning) {
      await this.stopTrading();
    }
    
    // Update mock status
    const startTime = Date.now();
    const totalDuration = pattern.duration * 60 * 1000; // Convert to milliseconds
    
    this.mockStatus = {
      isRunning: true,
      currentPattern: pattern.type,
      startTime,
      totalDuration,
      remainingTime: totalDuration
    };
    
    // Set up interval to update the remaining time
    this.mockInterval = setInterval(() => {
      if (this.mockStatus.remainingTime !== null && this.mockStatus.remainingTime > 0) {
        this.mockStatus.remainingTime = Math.max(0, this.mockStatus.remainingTime - 1000);
        
        // Generate new data point every minute
        if (this.mockStatus.remainingTime % 60000 === 0) {
          const lastPoint = this.mockData[this.mockData.length - 1];
          const priceChange = (Math.random() - 0.5) * 0.0002;
          const newPrice = Math.max(0.0001, lastPoint.price + priceChange);
          
          const newPoint: TradingDataPoint = {
            timestamp: Date.now(),
            price: newPrice,
            volume: Math.random() * 1000000,
            tradeCount: Math.floor(Math.random() * 100) + 1,
            whalePercentage: Math.random() * 100
          };
          
          this.mockData.push(newPoint);
          // Keep only the last 60 data points
          if (this.mockData.length > 60) {
            this.mockData.shift();
          }
          
          // Generate new transactions occasionally
          if (Math.random() > 0.7) {
            const newTransactions = generateMockTransactions(Math.floor(Math.random() * 3) + 1);
            this.mockTransactions = [...newTransactions, ...this.mockTransactions].slice(0, 100);
          }
        }
        
        // Stop when time is up
        if (this.mockStatus.remainingTime === 0) {
          this.stopTrading();
        }
      }
    }, 1000);
    
    return true;
  }
  
  /**
   * Stop trading
   */
  public async stopTrading(): Promise<boolean> {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    
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
    return {
      mint: this.tokenMint,
      name: 'SolTrader Token',
      symbol: 'STRD',
      decimals: 9,
      totalSupply: 1000000000
    };
  }
} 