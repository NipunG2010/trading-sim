import { PublicKey } from '@solana/web3.js';
import { TransactionLog } from '../types';
import { logger } from '../utils/logger';

interface BotMetrics {
  address: string;
  transactionCount: number;
  averageInterval: number;
  patternScore: number;
  volumeScore: number;
  lastTransactionTime: number;
}

interface BotDetectionConfig {
  minTransactions: number;
  timeWindow: number; // milliseconds
  maxAverageInterval: number;
  minPatternScore: number;
  minVolumeScore: number;
}

export class BotDetectionService {
  private metrics: Map<string, BotMetrics> = new Map();
  private transactionHistory: TransactionLog[] = [];
  private logger = logger.child({ module: 'BotDetection' });
  
  private config: BotDetectionConfig = {
    minTransactions: 10,
    timeWindow: 5 * 60 * 1000, // 5 minutes
    maxAverageInterval: 2000, // 2 seconds
    minPatternScore: 0.7,
    minVolumeScore: 0.8
  };

  constructor(config?: Partial<BotDetectionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  addTransaction(transaction: TransactionLog, address: PublicKey): void {
    const addressStr = address.toString();
    this.transactionHistory.push(transaction);

    // Update metrics for the address
    const currentMetrics = this.metrics.get(addressStr) || {
      address: addressStr,
      transactionCount: 0,
      averageInterval: 0,
      patternScore: 0,
      volumeScore: 0,
      lastTransactionTime: 0
    };

    // Update transaction count and timing
    const now = Date.now();
    if (currentMetrics.lastTransactionTime > 0) {
      const interval = now - currentMetrics.lastTransactionTime;
      currentMetrics.averageInterval = 
        (currentMetrics.averageInterval * currentMetrics.transactionCount + interval) / 
        (currentMetrics.transactionCount + 1);
    }

    currentMetrics.transactionCount++;
    currentMetrics.lastTransactionTime = now;

    // Update pattern and volume scores
    currentMetrics.patternScore = this.calculatePatternScore(addressStr);
    currentMetrics.volumeScore = this.calculateVolumeScore(addressStr);

    this.metrics.set(addressStr, currentMetrics);

    // Check for bot activity
    if (this.isBotLike(currentMetrics)) {
      this.logger.warn('Potential bot activity detected', {
        address: addressStr,
        metrics: currentMetrics
      });
    }

    // Clean up old transactions
    this.cleanupOldTransactions();
  }

  private isBotLike(metrics: BotMetrics): boolean {
    return (
      metrics.transactionCount >= this.config.minTransactions &&
      metrics.averageInterval <= this.config.maxAverageInterval &&
      metrics.patternScore >= this.config.minPatternScore &&
      metrics.volumeScore >= this.config.minVolumeScore
    );
  }

  private calculatePatternScore(address: string): number {
    const recentTransactions = this.getRecentTransactions(address);
    if (recentTransactions.length < this.config.minTransactions) {
      return 0;
    }

    // Check for regular intervals
    let intervalScore = 0;
    const intervals: number[] = [];
    for (let i = 1; i < recentTransactions.length; i++) {
      intervals.push(recentTransactions[i].timestamp - recentTransactions[i-1].timestamp);
    }

    const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.reduce((acc, interval) => 
      acc + Math.pow(interval - averageInterval, 2), 0) / intervals.length;
    
    intervalScore = 1 / (1 + Math.sqrt(intervalVariance) / averageInterval);

    // Check for repeated amounts or patterns
    const successfulTransactions = recentTransactions.filter(t => t.success);
    const uniquePatterns = new Set(successfulTransactions.map(t => t.signature)).size;
    const patternRepetitionScore = 1 - (uniquePatterns / successfulTransactions.length);

    return (intervalScore + patternRepetitionScore) / 2;
  }

  private calculateVolumeScore(address: string): number {
    const recentTransactions = this.getRecentTransactions(address);
    if (recentTransactions.length < this.config.minTransactions) {
      return 0;
    }

    // Calculate transaction frequency
    const timeSpan = recentTransactions[recentTransactions.length - 1].timestamp - 
                    recentTransactions[0].timestamp;
    const frequency = recentTransactions.length / (timeSpan / 1000); // transactions per second

    // Higher frequency indicates more bot-like behavior
    const frequencyScore = Math.min(frequency / 2, 1); // Cap at 2 TPS

    // Calculate success rate
    const successRate = recentTransactions.filter(t => t.success).length / 
                       recentTransactions.length;

    // Combine scores (high success rate + high frequency = more likely a bot)
    return (frequencyScore + successRate) / 2;
  }

  private getRecentTransactions(address: string): TransactionLog[] {
    const now = Date.now();
    return this.transactionHistory
      .filter(t => now - t.timestamp <= this.config.timeWindow)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private cleanupOldTransactions(): void {
    const now = Date.now();
    this.transactionHistory = this.transactionHistory.filter(
      t => now - t.timestamp <= this.config.timeWindow
    );
  }

  getBotMetrics(address: PublicKey): BotMetrics | undefined {
    return this.metrics.get(address.toString());
  }

  getAllBotMetrics(): BotMetrics[] {
    return Array.from(this.metrics.values())
      .filter(metrics => this.isBotLike(metrics))
      .sort((a, b) => 
        (b.patternScore + b.volumeScore) - (a.patternScore + a.volumeScore)
      );
  }

  resetMetrics(): void {
    this.metrics.clear();
    this.transactionHistory = [];
    this.logger.info('Bot detection metrics reset');
  }
} 