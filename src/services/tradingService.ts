import { Connection } from '@solana/web3.js';

// Trading pattern types
export type TradingPatternType = 
  | 'wash_trading' 
  | 'layering' 
  | 'accumulation' 
  | 'distribution' 
  | 'pump_and_dump'
  | 'organic_growth'
  | 'whale_activity'
  | 'retail_fomo';

// Trading pattern configuration
export interface TradingPatternConfig {
  type: TradingPatternType;
  duration: number; // in milliseconds
  intensity: number; // 1-10 scale
}

// Trading data point
export interface TradingDataPoint {
  timestamp: number;
  price: number;
  volume: number;
}

// Trading status
export interface TradingStatus {
  isRunning: boolean;
  currentPattern: TradingPatternType | null;
  remainingTime: number | null;
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
    remainingTime: null
  };
  private mockInterval: NodeJS.Timeout | null = null;
  private mockData: TradingDataPoint[] = [];
  
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
    
    // Generate 24 hours of mock data
    for (let i = 0; i < 24; i++) {
      const timestamp = now - (24 - i) * 60 * 60 * 1000;
      const price = 0.1 + Math.random() * 0.05; // Random price between 0.1 and 0.15
      const volume = 10000 + Math.random() * 50000; // Random volume between 10k and 60k
      
      this.mockData.push({ timestamp, price, volume });
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
        id: 'wash_trading', 
        name: 'Wash Trading', 
        description: 'High volume trading between the same wallets', 
        defaultDuration: 30 * 60 * 1000, 
        defaultIntensity: 7 
      },
      { 
        id: 'layering', 
        name: 'Layering', 
        description: 'Multiple buy orders at different price levels', 
        defaultDuration: 45 * 60 * 1000, 
        defaultIntensity: 6 
      },
      { 
        id: 'accumulation', 
        name: 'Accumulation', 
        description: 'Whales gradually buying from retail', 
        defaultDuration: 60 * 60 * 1000, 
        defaultIntensity: 5 
      },
      { 
        id: 'distribution', 
        name: 'Distribution', 
        description: 'Whales gradually selling to retail', 
        defaultDuration: 60 * 60 * 1000, 
        defaultIntensity: 5 
      },
      { 
        id: 'pump_and_dump', 
        name: 'Pump and Dump', 
        description: 'Rapid price increase followed by quick distribution', 
        defaultDuration: 90 * 60 * 1000, 
        defaultIntensity: 9 
      },
      { 
        id: 'organic_growth', 
        name: 'Organic Growth', 
        description: 'Natural-looking trading with varied wallet types', 
        defaultDuration: 120 * 60 * 1000, 
        defaultIntensity: 4 
      },
      { 
        id: 'whale_activity', 
        name: 'Whale Activity', 
        description: 'Large trades from whale wallets', 
        defaultDuration: 45 * 60 * 1000, 
        defaultIntensity: 8 
      },
      { 
        id: 'retail_fomo', 
        name: 'Retail FOMO', 
        description: 'Many small retail buys with increasing frequency', 
        defaultDuration: 60 * 60 * 1000, 
        defaultIntensity: 7 
      }
    ];
  }
  
  /**
   * Get trading data
   */
  public async getTradingData(): Promise<TradingDataPoint[]> {
    // In a real implementation, this would fetch from the backend
    return [...this.mockData];
  }
  
  /**
   * Get trading status
   */
  public async getTradingStatus(): Promise<TradingStatus> {
    // In a real implementation, this would fetch from the backend
    return { ...this.mockStatus };
  }
  
  /**
   * Start trading with a specific pattern
   */
  public async startTrading(pattern: TradingPatternConfig): Promise<boolean> {
    // In a real implementation, this would call the backend API
    console.log(`Starting ${pattern.type} pattern for ${pattern.duration / 60000} minutes with intensity ${pattern.intensity}`);
    
    // Update mock status
    this.mockStatus = {
      isRunning: true,
      currentPattern: pattern.type,
      remainingTime: pattern.duration
    };
    
    // Start mock countdown
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }
    
    this.mockInterval = setInterval(() => {
      if (this.mockStatus.remainingTime !== null && this.mockStatus.remainingTime > 0) {
        this.mockStatus.remainingTime -= 1000;
        
        // Generate new data point every minute
        if (this.mockStatus.remainingTime % 60000 === 0) {
          const lastPoint = this.mockData[this.mockData.length - 1];
          const newTimestamp = lastPoint.timestamp + 60000;
          
          // Generate new price based on pattern
          let priceChange = 0;
          switch (pattern.type) {
            case 'accumulation':
              priceChange = 0.001 * (Math.random() * 0.5 + 0.5); // Small positive change
              break;
            case 'distribution':
              priceChange = -0.001 * (Math.random() * 0.5 + 0.5); // Small negative change
              break;
            case 'pump_and_dump':
              // Pump phase (first 70% of duration)
              if (this.mockStatus.remainingTime > pattern.duration * 0.3) {
                priceChange = 0.005 * (Math.random() * 0.5 + 0.5); // Larger positive change
              } else {
                priceChange = -0.01 * (Math.random() * 0.5 + 0.5); // Larger negative change
              }
              break;
            case 'organic_growth':
              priceChange = 0.002 * (Math.random() - 0.3); // Mostly positive with some dips
              break;
            case 'whale_activity':
              priceChange = 0.01 * (Math.random() - 0.4); // Larger swings
              break;
            case 'retail_fomo':
              priceChange = 0.003 * (Math.random() * 0.8 + 0.2); // Mostly positive
              break;
            default:
              priceChange = 0.001 * (Math.random() * 2 - 1); // Random small change
          }
          
          const newPrice = Math.max(0.01, lastPoint.price * (1 + priceChange));
          
          // Generate new volume based on pattern
          let volumeMultiplier = 1;
          switch (pattern.type) {
            case 'wash_trading':
              volumeMultiplier = 2 + Math.random(); // High volume
              break;
            case 'pump_and_dump':
              volumeMultiplier = 1.5 + Math.random(); // Higher volume
              break;
            case 'whale_activity':
              volumeMultiplier = 1.8 + Math.random(); // Higher volume
              break;
            default:
              volumeMultiplier = 0.8 + Math.random() * 0.4; // Normal volume
          }
          
          const newVolume = lastPoint.volume * volumeMultiplier;
          
          // Add new data point
          this.mockData.push({
            timestamp: newTimestamp,
            price: newPrice,
            volume: newVolume
          });
          
          // Keep only the last 24 hours of data
          if (this.mockData.length > 24 * 60) {
            this.mockData.shift();
          }
        }
      } else {
        // Stop trading when time is up
        this.stopTrading();
      }
    }, 1000);
    
    return true;
  }
  
  /**
   * Stop trading
   */
  public async stopTrading(): Promise<boolean> {
    // In a real implementation, this would call the backend API
    console.log('Stopping trading');
    
    // Update mock status
    this.mockStatus = {
      isRunning: false,
      currentPattern: null,
      remainingTime: null
    };
    
    // Clear mock interval
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    
    return true;
  }
  
  /**
   * Get token information
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
      name: 'Stellar Protocol',
      symbol: 'STLR',
      decimals: 9,
      totalSupply: 1_000_000_000
    };
  }
} 