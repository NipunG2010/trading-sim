import { PublicKey, Keypair } from '@solana/web3.js';

/**
 * Unified trading pattern types for the entire application
 */

export enum TradingPatternType {
  // Technical Analysis Patterns
  MOVING_AVERAGE_CROSSOVER = 'moving_average_crossover',
  FIBONACCI_RETRACEMENT = 'fibonacci_retracement',
  BOLLINGER_BANDS = 'bollinger_bands',
  MACD_CROSSOVER = 'macd_crossover',
  RSI_DIVERGENCE = 'rsi_divergence',

  // Volume Patterns
  ACCUMULATION = 'accumulation',
  DISTRIBUTION = 'distribution',
  VWAP_BOUNCE = 'vwap_bounce',
  OBV_TREND = 'obv_trend',

  // Organic Activity
  MICROTRANSACTIONS = 'microtransactions',
  STEPPING = 'stepping',
  RESISTANCE_BREAKTHROUGH = 'resistance_breakthrough',

  // Bot-Specific Patterns
  WASH_TRADING = 'wash_trading',
  LAYERING = 'layering',
  WHALE_ACTIVITY = 'whale_activity',
  RETAIL_FOMO = 'retail_fomo'
}

export interface TradeMetrics {
  timestamp: number;
  amount: number;
  price: number;
  wallet: string;
  type: 'BUY' | 'SELL';
  patternType: TradingPatternType;
  transactionId: string;
}

export interface WalletInfo {
  publicKey: PublicKey;
  keypair: Keypair;
  type: WalletType;
  balance: number;
}

export enum WalletType {
  WHALE = 'whale',
  RETAIL = 'retail',
  BOT = 'bot'
}

export interface TradingPatternConfig {
  type: TradingPatternType;
  duration: number; // in milliseconds
  intensity: number; // 1-10 scale
  targetPriceChange?: number; // percentage
  volumeMultiplier?: number; // multiplier for base volume
  stopLoss?: number; // optional stop loss price
  takeProfit?: number; // optional take profit price
  walletParticipation?: {
    whale: number; // 0-1 percentage
    retail: number; // 0-1 percentage
    bot: number; // 0-1 percentage
  };
}

export interface TradeParameters {
  amount: number;
  price: number;
  delay: number; // milliseconds between trades
  wallet: WalletInfo;
}

export interface PatternState {
  startTime: number;
  endTime: number;
  currentPrice: number;
  initialPrice: number;
  trades: TradeMetrics[];
  status: PatternStatus;
  progress: number; // 0-1
  phase: PatternPhase;
}

export enum PatternStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

export enum PatternPhase {
  INITIALIZATION = 'initialization',
  ACCUMULATION = 'accumulation',
  DISTRIBUTION = 'distribution',
  BREAKOUT = 'breakout',
  CONSOLIDATION = 'consolidation',
  COMPLETION = 'completion'
}

export interface TradingPatternMetadata {
  id: TradingPatternType;
  name: string;
  description: string;
  defaultDuration: number;
  defaultIntensity: number;
  riskLevel: RiskLevel;
  complexity: ComplexityLevel;
  recommendedWalletTypes: WalletType[];
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export enum ComplexityLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface TradingError extends Error {
  code: TradingErrorCode;
  details?: Record<string, unknown>;
  timestamp: number;
  patternType?: TradingPatternType;
}

export enum TradingErrorCode {
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  INVALID_CONFIGURATION = 'invalid_configuration',
  NETWORK_ERROR = 'network_error',
  TRANSACTION_FAILED = 'transaction_failed',
  PATTERN_INTERRUPTED = 'pattern_interrupted',
  SAFETY_LIMIT_REACHED = 'safety_limit_reached',
  WALLET_ERROR = 'wallet_error',
  UNKNOWN_ERROR = 'unknown_error'
} 