import { PublicKey } from '@solana/web3.js';

export interface StrategyStatus {
  isActive: boolean;
  currentPhase: string;
  metrics: {
    price: number;
    volume24h: number;
    liquidityUSD: number;
    rsi: number;
    macd: {
      signal: number;
      histogram: number;
    };
  };
}

export interface StrategyConfig {
  targetToken: PublicKey;
  timeframe: number; // in minutes
  volumeTargets: {
    daily: number;
    hourly: number;
  };
  priceTargets: {
    min: number;
    max: number;
    stairStepSize: number;
    retracement: number;
  };
  liquidityRanges: {
    min: number;
    max: number;
    targetRatio: number;
  };
  technicalLevels: {
    rsi: {
      min: number;
      max: number;
    };
    macd: {
      crossoverInterval: number; // in hours
      signalPeriod: number;
    };
    movingAverages: {
      shortPeriod: number;
      longPeriod: number;
      deviation: number; // percentage above MA
    };
  };
  timingWindows: {
    utc: {
      start: number;
      end: number;
      volumePercentage: number;
    }[];
  };
}

export interface TradeExecutionResult {
  success: boolean;
  txId?: string;
  error?: string;
  price: number;
  amount: number;
  timestamp: number;
}

export interface MarketMetrics {
  price: number;
  volume24h: number;
  liquidityUSD: number;
  rsi: number;
  macd: {
    signal: number;
    histogram: number;
  };
  movingAverages: {
    short: number;
    long: number;
  };
} 