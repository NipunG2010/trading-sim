import { Connection, PublicKey } from '@solana/web3.js';
import { JupiterService } from '../../services/JupiterService';
import {
  TradingPatternType,
  TradingPatternConfig,
  PatternState,
  TradeMetrics,
  WalletInfo,
  PatternStatus,
  PatternPhase,
  TradingError,
  TradingErrorCode,
  TradeParameters
} from '../types/TradingPatternTypes';
import { logger } from '../../utils/logger';

/**
 * Abstract base class for all trading patterns
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseTradingPattern {
  protected connection: Connection;
  protected jupiterService: JupiterService;
  protected tokenMint: PublicKey;
  protected state: PatternState;
  protected config: TradingPatternConfig;
  protected wallets: WalletInfo[];

  constructor(
    connection: Connection,
    tokenMint: PublicKey,
    config: TradingPatternConfig,
    wallets: WalletInfo[]
  ) {
    this.connection = connection;
    this.tokenMint = tokenMint;
    this.config = this.validateConfig(config);
    this.wallets = wallets;
    this.jupiterService = new JupiterService(connection);
    
    this.state = {
      startTime: 0,
      endTime: 0,
      currentPrice: 0,
      initialPrice: 0,
      trades: [],
      status: PatternStatus.PENDING,
      progress: 0,
      phase: PatternPhase.INITIALIZATION
    };
  }

  /**
   * Initialize the pattern
   * Must be called before start()
   */
  public async initialize(): Promise<void> {
    try {
      await this.jupiterService.initialize();
      this.state.status = PatternStatus.PENDING;
      logger.info(`Initialized ${this.config.type} pattern`);
    } catch (error) {
      const tradingError: TradingError = {
        name: 'InitializationError',
        message: `Failed to initialize pattern: ${error.message}`,
        code: TradingErrorCode.UNKNOWN_ERROR,
        timestamp: Date.now(),
        patternType: this.config.type
      };
      logger.error(tradingError);
      throw tradingError;
    }
  }

  /**
   * Start the trading pattern
   */
  public async start(): Promise<void> {
    try {
      this.state.startTime = Date.now();
      this.state.endTime = this.state.startTime + this.config.duration;
      this.state.status = PatternStatus.RUNNING;
      
      // Get initial price
      const orderBookState = await this.jupiterService.getOrderBookState();
      this.state.initialPrice = orderBookState.bids[0]?.price || 0;
      this.state.currentPrice = this.state.initialPrice;

      logger.info(`Starting ${this.config.type} pattern`);
      await this.executePattern();
      
    } catch (error) {
      const tradingError: TradingError = {
        name: 'ExecutionError',
        message: `Pattern execution failed: ${error.message}`,
        code: TradingErrorCode.PATTERN_INTERRUPTED,
        timestamp: Date.now(),
        patternType: this.config.type
      };
      logger.error(tradingError);
      throw tradingError;
    }
  }

  /**
   * Stop the trading pattern
   */
  public async stop(): Promise<void> {
    this.state.status = PatternStatus.STOPPED;
    this.state.endTime = Date.now();
    logger.info(`Stopped ${this.config.type} pattern`);
  }

  /**
   * Get current pattern state
   */
  public getState(): PatternState {
    return { ...this.state };
  }

  /**
   * Execute a trade
   */
  protected async executeTrade(params: TradeParameters): Promise<string> {
    try {
      const txid = await this.jupiterService.executeTrade({
        inputMint: this.tokenMint,
        outputMint: this.tokenMint,
        amount: params.amount,
        slippageBps: 100,
        wallet: params.wallet.keypair
      });

      const trade: TradeMetrics = {
        timestamp: Date.now(),
        amount: params.amount,
        price: params.price,
        wallet: params.wallet.publicKey.toString(),
        type: params.amount > 0 ? 'BUY' : 'SELL',
        patternType: this.config.type,
        transactionId: txid
      };

      this.state.trades.push(trade);
      this.state.currentPrice = params.price;
      
      return txid;
    } catch (error) {
      const tradingError: TradingError = {
        name: 'TradeExecutionError',
        message: `Failed to execute trade: ${error.message}`,
        code: TradingErrorCode.TRANSACTION_FAILED,
        timestamp: Date.now(),
        patternType: this.config.type,
        details: {
          amount: params.amount,
          price: params.price,
          wallet: params.wallet.publicKey.toString()
        }
      };
      logger.error(tradingError);
      throw tradingError;
    }
  }

  /**
   * Update pattern state
   */
  protected updateState(progress: number, phase: PatternPhase): void {
    this.state.progress = progress;
    this.state.phase = phase;
    
    if (progress >= 1) {
      this.state.status = PatternStatus.COMPLETED;
      this.state.endTime = Date.now();
    }
  }

  /**
   * Validate pattern configuration
   */
  protected validateConfig(config: TradingPatternConfig): TradingPatternConfig {
    if (!config.type || !config.duration || !config.intensity) {
      throw {
        name: 'ConfigurationError',
        message: 'Invalid pattern configuration',
        code: TradingErrorCode.INVALID_CONFIGURATION,
        timestamp: Date.now(),
        patternType: config.type
      };
    }

    if (config.intensity < 1 || config.intensity > 10) {
      throw {
        name: 'ConfigurationError',
        message: 'Intensity must be between 1 and 10',
        code: TradingErrorCode.INVALID_CONFIGURATION,
        timestamp: Date.now(),
        patternType: config.type
      };
    }

    return config;
  }

  /**
   * Check if pattern should continue running
   */
  protected shouldContinue(): boolean {
    if (this.state.status !== PatternStatus.RUNNING) return false;
    if (Date.now() >= this.state.endTime) return false;
    
    // Check stop loss if configured
    if (this.config.stopLoss && this.state.currentPrice <= this.config.stopLoss) {
      logger.warn(`Stop loss triggered at ${this.state.currentPrice}`);
      return false;
    }
    
    // Check take profit if configured
    if (this.config.takeProfit && this.state.currentPrice >= this.config.takeProfit) {
      logger.info(`Take profit triggered at ${this.state.currentPrice}`);
      return false;
    }
    
    return true;
  }

  /**
   * Abstract method that must be implemented by each pattern
   */
  protected abstract executePattern(): Promise<void>;

  /**
   * Abstract method to calculate trade parameters
   */
  protected abstract calculateTradeParameters(): TradeParameters;
} 