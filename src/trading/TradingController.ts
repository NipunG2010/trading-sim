import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { StrategyFactory } from './factories/StrategyFactory';
import { StrategyConfig } from './types/StrategyTypes';
import { TRADING_CONSTANTS } from './constants/TradingConstants';

export class TradingController {
  private connection: Connection;
  private targetToken: PublicKey;
  private strategyFactory: StrategyFactory;
  private isRunning: boolean = false;
  private startTime: number = 0;

  constructor(
    connection: Connection,
    targetToken: PublicKey
  ) {
    this.connection = connection;
    this.targetToken = targetToken;
    this.strategyFactory = new StrategyFactory(connection, targetToken);
  }

  async initialize(walletKeypairs: Keypair[]): Promise<void> {
    try {
      // Initialize wallet service
      const walletService = this.strategyFactory.getWalletService();
      await walletService.loadWallets(walletKeypairs);

      // Start market data service
      await this.strategyFactory.start();

      console.log('Trading controller initialized successfully');
    } catch (error) {
      console.error('Error initializing trading controller:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Trading controller is already running');
    }

    try {
      this.isRunning = true;
      this.startTime = Date.now();

      // Create strategy configuration
      const config = this.createStrategyConfig();

      // Create and start timing strategy
      const timingStrategy = await this.strategyFactory.createTimingStrategy(config);
      
      console.log('Starting trading execution...');
      await timingStrategy.execute();

    } catch (error) {
      console.error('Error starting trading controller:', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.strategyFactory.stop();
      this.isRunning = false;
      console.log('Trading controller stopped successfully');
    } catch (error) {
      console.error('Error stopping trading controller:', error);
      throw error;
    }
  }

  private createStrategyConfig(): StrategyConfig {
    const walletService = this.strategyFactory.getWalletService();
    const totalBalance = walletService.getTotalBalance();

    return {
      targetToken: this.targetToken,
      timeframe: 60, // 1-hour timeframe
      volumeTargets: {
        daily: TRADING_CONSTANTS.VOLUME.INITIAL_DAILY_SOL,
        hourly: TRADING_CONSTANTS.VOLUME.INITIAL_DAILY_SOL / 24
      },
      priceTargets: {
        min: 0.001,
        max: 1000,
        stairStepSize: TRADING_CONSTANTS.PRICE.STAIR_STEPS.UP_PERCENT,
        retracement: TRADING_CONSTANTS.PRICE.STAIR_STEPS.DOWN_PERCENT
      },
      liquidityRanges: {
        min: TRADING_CONSTANTS.SAFETY.MIN_LIQUIDITY_SOL,
        max: totalBalance,
        targetRatio: 0.5
      },
      technicalLevels: {
        rsi: {
          min: TRADING_CONSTANTS.TECHNICAL.RSI.TARGET_MIN,
          max: TRADING_CONSTANTS.TECHNICAL.RSI.TARGET_MAX
        },
        macd: {
          crossoverInterval: TRADING_CONSTANTS.TECHNICAL.MACD.CROSSOVER_INTERVAL_HOURS,
          signalPeriod: 9
        },
        movingAverages: {
          shortPeriod: TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.MA_PERIODS.SHORT,
          longPeriod: TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.MA_PERIODS.LONG,
          deviation: TRADING_CONSTANTS.TECHNICAL.MOVING_AVERAGES.PRICE_ABOVE_20MA_PERCENT
        }
      },
      timingWindows: {
        utc: TRADING_CONSTANTS.TIME_WINDOWS.PEAK_WINDOWS.map(window => ({
          start: window.start,
          end: window.end,
          volumePercentage: window.volumePercent
        }))
      }
    };
  }

  getStrategyFactory(): StrategyFactory {
    return this.strategyFactory;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getRunningTime(): number {
    if (!this.isRunning || this.startTime === 0) {
      return 0;
    }
    return Date.now() - this.startTime;
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    runningTime: number;
    activeStrategies: string[];
    metrics: {
      totalBalance: number;
      whaleWallets: number;
      retailWallets: number;
    };
  }> {
    const walletService = this.strategyFactory.getWalletService();
    const activeStrategies = Array.from(this.strategyFactory.getActiveStrategies().keys());

    return {
      isRunning: this.isRunning,
      runningTime: this.getRunningTime(),
      activeStrategies,
      metrics: {
        totalBalance: walletService.getTotalBalance(),
        whaleWallets: walletService.getWalletCount('whale'),
        retailWallets: walletService.getWalletCount('retail')
      }
    };
  }
} 