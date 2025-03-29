export interface TradingPatternConfig {
  type: 'MOVING_AVERAGE_CROSSOVER' | 'FIBONACCI_RETRACEMENT' | 'BOLLINGER_BANDS' | 'MACD_CROSSOVER' | 'RSI_DIVERGENCE';
  duration: number;
  intensity: number;
}

export interface TradingDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  tradeCount: number;
  whalePercentage: number;
}

export interface TokenTransaction {
  timestamp: number;
  sender: string;
  receiver: string;
  amount: number;
  isWhale: boolean;
  signature: string;
}

export interface TradingStatus {
  isRunning: boolean;
  currentPattern: TradingPatternConfig | null;
  remainingTime: number | null;
  startTime: number | null;
  totalDuration: number | null;
}