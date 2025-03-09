// src/trading-engine.ts
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionSignature
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as fs from "fs";
import { TransactionQueue, TransactionPriority, SignatureStatusTracker, GasPriceOptimizer } from "./transaction-queue";

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
interface TradingPatternConfig {
  type: TradingPatternType;
  duration: number; // in milliseconds
  intensity: number; // 1-10 scale
  targetPriceChange?: number; // percentage
  volumeMultiplier?: number; // multiplier for base volume
}

// Wallet type
interface Wallet {
  publicKey: string;
  secretKey: string;
  type: 'whale' | 'retail';
  keypair: Keypair;
}

// Trade type
interface Trade {
  from: Wallet;
  to: Wallet;
  amount: number; // in token units
  price?: number; // in SOL per token
  priority: TransactionPriority;
}

/**
 * Trading Engine for simulating various trading patterns
 */
export class TradingEngine {
  private connection: Connection;
  private mint: PublicKey;
  private wallets: Wallet[] = [];
  private transactionQueue: TransactionQueue;
  private signatureTracker: SignatureStatusTracker;
  private gasPriceOptimizer: GasPriceOptimizer;
  private isRunning: boolean = false;
  private currentPattern: TradingPatternConfig | null = null;
  private patternTimeout: NodeJS.Timeout | null = null;
  private tokenDecimals: number;
  
  constructor(
    connection: Connection,
    mint: string,
    tokenDecimals: number,
    accountsPath: string = "../accounts.json"
  ) {
    this.connection = connection;
    this.mint = new PublicKey(mint);
    this.tokenDecimals = tokenDecimals;
    this.transactionQueue = new TransactionQueue(connection);
    this.signatureTracker = new SignatureStatusTracker(connection);
    this.gasPriceOptimizer = new GasPriceOptimizer(connection);
    
    // Load wallets
    this.loadWallets(accountsPath);
  }
  
  /**
   * Load wallets from accounts.json
   */
  private loadWallets(accountsPath: string): void {
    try {
      const accountData = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));
      
      this.wallets = accountData.map((account: any, index: number) => {
        const keypair = Keypair.fromSecretKey(Buffer.from(account.secretKey, "base64"));
        return {
          publicKey: account.publicKey,
          secretKey: account.secretKey,
          type: index < 20 ? 'whale' : 'retail',
          keypair
        };
      });
      
      console.log(`Loaded ${this.wallets.length} wallets (${this.wallets.filter(w => w.type === 'whale').length} whales, ${this.wallets.filter(w => w.type === 'retail').length} retail)`);
    } catch (error) {
      console.error("Error loading wallets:", error);
      throw new Error("Failed to load wallets");
    }
  }
  
  /**
   * Start trading with a specific pattern
   */
  public startTrading(pattern: TradingPatternConfig): void {
    if (this.isRunning) {
      console.log("Trading is already running. Stop current pattern first.");
      return;
    }
    
    this.isRunning = true;
    this.currentPattern = pattern;
    
    console.log(`Starting trading pattern: ${pattern.type} (duration: ${pattern.duration}ms, intensity: ${pattern.intensity}/10)`);
    
    // Execute pattern
    this.executePattern(pattern);
    
    // Set timeout to stop pattern
    this.patternTimeout = setTimeout(() => {
      this.stopTrading();
    }, pattern.duration);
  }
  
  /**
   * Stop current trading pattern
   */
  public stopTrading(): void {
    if (!this.isRunning) {
      console.log("No trading pattern is currently running.");
      return;
    }
    
    this.isRunning = false;
    
    if (this.patternTimeout) {
      clearTimeout(this.patternTimeout);
      this.patternTimeout = null;
    }
    
    this.currentPattern = null;
    console.log("Trading pattern stopped.");
  }
  
  /**
   * Execute a trading pattern
   */
  private executePattern(pattern: TradingPatternConfig): void {
    switch (pattern.type) {
      case 'wash_trading':
        this.executeWashTrading(pattern);
        break;
      case 'layering':
        this.executeLayering(pattern);
        break;
      case 'accumulation':
        this.executeAccumulation(pattern);
        break;
      case 'distribution':
        this.executeDistribution(pattern);
        break;
      case 'pump_and_dump':
        this.executePumpAndDump(pattern);
        break;
      case 'organic_growth':
        this.executeOrganicGrowth(pattern);
        break;
      case 'whale_activity':
        this.executeWhaleActivity(pattern);
        break;
      case 'retail_fomo':
        this.executeRetailFOMO(pattern);
        break;
      default:
        console.error(`Unknown pattern type: ${(pattern as any).type}`);
    }
  }
  
  /**
   * Execute a wash trading pattern
   * - High volume, no real price change
   * - Same wallets trading back and forth
   */
  private executeWashTrading(pattern: TradingPatternConfig): void {
    // Select a subset of wallets for wash trading
    const washWallets = this.getRandomWallets(Math.min(10, Math.floor(this.wallets.length / 2)));
    
    // Calculate trade frequency based on intensity
    const tradeInterval = Math.max(1000, 10000 - pattern.intensity * 900); // 1-10 seconds
    
    // Start wash trading loop
    const washTradingInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(washTradingInterval);
        return;
      }
      
      // Select random sender and receiver
      const [sender, receiver] = this.getRandomPair(washWallets);
      
      // Random amount (0.1% to 1% of total supply)
      const amount = this.getRandomAmount(0.001, 0.01);
      
      // Execute trade
      this.executeTrade({
        from: sender,
        to: receiver,
        amount,
        priority: 'medium'
      });
    }, tradeInterval);
  }
  
  /**
   * Execute a layering pattern
   * - Create multiple buy orders at different price levels
   * - Cancel and replace orders to create illusion of demand
   */
  private executeLayering(pattern: TradingPatternConfig): void {
    // Select whale wallets for layering
    const whaleWallets = this.wallets.filter(w => w.type === 'whale');
    
    // Calculate trade frequency based on intensity
    const tradeInterval = Math.max(2000, 20000 - pattern.intensity * 1800); // 2-20 seconds
    
    // Start layering loop
    const layeringInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(layeringInterval);
        return;
      }
      
      // Select random whale
      const whale = this.getRandomWallet(whaleWallets);
      
      // Select random retail wallets as recipients
      const retailWallets = this.wallets.filter(w => w.type === 'retail');
      const recipients = this.getRandomWallets(Math.min(3, retailWallets.length), retailWallets);
      
      // Execute multiple small trades to create layering effect
      recipients.forEach(recipient => {
        // Small amount (0.05% to 0.2% of total supply)
        const amount = this.getRandomAmount(0.0005, 0.002);
        
        // Execute trade
        this.executeTrade({
          from: whale,
          to: recipient,
          amount,
          priority: 'high'
        });
      });
    }, tradeInterval);
  }
  
  /**
   * Execute an accumulation pattern
   * - Whales gradually buying from retail
   * - Low price impact, steady volume
   */
  private executeAccumulation(pattern: TradingPatternConfig): void {
    // Select whale wallets for accumulation
    const whaleWallets = this.wallets.filter(w => w.type === 'whale');
    
    // Select retail wallets as sellers
    const retailWallets = this.wallets.filter(w => w.type === 'retail');
    
    // Calculate trade frequency based on intensity
    const tradeInterval = Math.max(5000, 30000 - pattern.intensity * 2500); // 5-30 seconds
    
    // Start accumulation loop
    const accumulationInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(accumulationInterval);
        return;
      }
      
      // Select random whale and retail wallet
      const whale = this.getRandomWallet(whaleWallets);
      const retail = this.getRandomWallet(retailWallets);
      
      // Small amount (0.1% to 0.5% of total supply)
      const amount = this.getRandomAmount(0.001, 0.005);
      
      // Execute trade from retail to whale (accumulation)
      this.executeTrade({
        from: retail,
        to: whale,
        amount,
        priority: 'low'
      });
    }, tradeInterval);
  }
  
  /**
   * Execute a distribution pattern
   * - Whales gradually selling to retail
   * - Controlled selling to minimize price impact
   */
  private executeDistribution(pattern: TradingPatternConfig): void {
    // Select whale wallets for distribution
    const whaleWallets = this.wallets.filter(w => w.type === 'whale');
    
    // Select retail wallets as buyers
    const retailWallets = this.wallets.filter(w => w.type === 'retail');
    
    // Calculate trade frequency based on intensity
    const tradeInterval = Math.max(5000, 30000 - pattern.intensity * 2500); // 5-30 seconds
    
    // Start distribution loop
    const distributionInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(distributionInterval);
        return;
      }
      
      // Select random whale and retail wallet
      const whale = this.getRandomWallet(whaleWallets);
      const retail = this.getRandomWallet(retailWallets);
      
      // Small amount (0.1% to 0.5% of total supply)
      const amount = this.getRandomAmount(0.001, 0.005);
      
      // Execute trade from whale to retail (distribution)
      this.executeTrade({
        from: whale,
        to: retail,
        amount,
        priority: 'low'
      });
    }, tradeInterval);
  }
  
  /**
   * Execute a pump and dump pattern
   * - Initial accumulation phase
   * - Rapid price increase with high volume
   * - Quick distribution at the top
   */
  private executePumpAndDump(pattern: TradingPatternConfig): void {
    const pumpDuration = pattern.duration * 0.7; // 70% of time for pump
    const dumpDuration = pattern.duration * 0.3; // 30% of time for dump
    
    // Start with accumulation/pump
    const pumpPattern: TradingPatternConfig = {
      type: 'accumulation',
      duration: pumpDuration,
      intensity: pattern.intensity * 1.5 > 10 ? 10 : pattern.intensity * 1.5
    };
    
    this.executePattern(pumpPattern);
    
    // Schedule the dump phase
    setTimeout(() => {
      if (!this.isRunning) return;
      
      // Switch to distribution/dump
      const dumpPattern: TradingPatternConfig = {
        type: 'distribution',
        duration: dumpDuration,
        intensity: pattern.intensity * 2 > 10 ? 10 : pattern.intensity * 2
      };
      
      this.executePattern(dumpPattern);
    }, pumpDuration);
  }
  
  /**
   * Execute an organic growth pattern
   * - Mix of different wallet types
   * - Varied trade sizes
   * - Natural-looking volume and price action
   */
  private executeOrganicGrowth(pattern: TradingPatternConfig): void {
    // Calculate trade frequency based on intensity
    const tradeInterval = Math.max(3000, 15000 - pattern.intensity * 1200); // 3-15 seconds
    
    // Start organic growth loop
    const organicGrowthInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(organicGrowthInterval);
        return;
      }
      
      // Randomly decide trade direction (60% buys, 40% sells)
      const isBuy = Math.random() < 0.6;
      
      // Select wallets based on direction
      let from, to;
      
      if (isBuy) {
        // Retail buying from whales
        from = this.getRandomWallet(this.wallets.filter(w => w.type === 'whale'));
        to = this.getRandomWallet(this.wallets.filter(w => w.type === 'retail'));
      } else {
        // Retail selling to whales
        from = this.getRandomWallet(this.wallets.filter(w => w.type === 'retail'));
        to = this.getRandomWallet(this.wallets.filter(w => w.type === 'whale'));
      }
      
      // Random amount (0.05% to 0.3% of total supply)
      const amount = this.getRandomAmount(0.0005, 0.003);
      
      // Random priority
      const priorities: TransactionPriority[] = ['low', 'medium', 'high'];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      
      // Execute trade
      this.executeTrade({
        from,
        to,
        amount,
        priority
      });
    }, tradeInterval);
  }
  
  /**
   * Execute a whale activity pattern
   * - Large trades from whale wallets
   * - Significant price impact
   * - Infrequent but impactful
   */
  private executeWhaleActivity(pattern: TradingPatternConfig): void {
    // Select whale wallets
    const whaleWallets = this.wallets.filter(w => w.type === 'whale');
    
    // Calculate trade frequency based on intensity (less frequent, more impactful)
    const tradeInterval = Math.max(10000, 60000 - pattern.intensity * 5000); // 10-60 seconds
    
    // Start whale activity loop
    const whaleActivityInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(whaleActivityInterval);
        return;
      }
      
      // Select random whale
      const whale = this.getRandomWallet(whaleWallets);
      
      // Randomly decide trade direction (50/50)
      const isBuy = Math.random() < 0.5;
      
      let from, to;
      
      if (isBuy) {
        // Whale buying from multiple retail
        from = this.getRandomWallet(this.wallets.filter(w => w.type === 'retail'));
        to = whale;
      } else {
        // Whale selling to multiple retail
        from = whale;
        to = this.getRandomWallet(this.wallets.filter(w => w.type === 'retail'));
      }
      
      // Large amount (1% to 3% of total supply)
      const amount = this.getRandomAmount(0.01, 0.03);
      
      // Execute trade with high priority
      this.executeTrade({
        from,
        to,
        amount,
        priority: 'high'
      });
    }, tradeInterval);
  }
  
  /**
   * Execute a retail FOMO pattern
   * - Many small retail buys
   * - Increasing frequency
   * - Price momentum building
   */
  private executeRetailFOMO(pattern: TradingPatternConfig): void {
    // Select retail wallets
    const retailWallets = this.wallets.filter(w => w.type === 'retail');
    
    // Select whale wallets as sellers
    const whaleWallets = this.wallets.filter(w => w.type === 'whale');
    
    // Initial trade interval
    let tradeInterval = Math.max(5000, 20000 - pattern.intensity * 1500); // 5-20 seconds
    
    // Acceleration factor (interval will decrease over time)
    const accelerationFactor = 0.9;
    
    // Minimum interval
    const minInterval = 1000; // 1 second
    
    // Start retail FOMO loop
    let retailFOMOInterval: NodeJS.Timeout;
    
    const startFOMOLoop = () => {
      retailFOMOInterval = setTimeout(() => {
        if (!this.isRunning) return;
        
        // Select random retail wallet and whale
        const retail = this.getRandomWallet(retailWallets);
        const whale = this.getRandomWallet(whaleWallets);
        
        // Small to medium amount (0.1% to 0.8% of total supply)
        const amount = this.getRandomAmount(0.001, 0.008);
        
        // Execute trade from whale to retail (FOMO buying)
        this.executeTrade({
          from: whale,
          to: retail,
          amount,
          priority: 'medium'
        });
        
        // Decrease interval (accelerate trading)
        tradeInterval = Math.max(minInterval, tradeInterval * accelerationFactor);
        
        // Continue the loop
        startFOMOLoop();
      }, tradeInterval);
    };
    
    // Start the FOMO loop
    startFOMOLoop();
  }
  
  /**
   * Execute a trade between two wallets
   */
  private async executeTrade(trade: Trade): Promise<void> {
    try {
      const { from, to, amount, priority } = trade;
      
      // Get token accounts
      const fromTokenAddress = await getAssociatedTokenAddress(
        this.mint,
        new PublicKey(from.publicKey)
      );
      
      const toTokenAddress = await getAssociatedTokenAddress(
        this.mint,
        new PublicKey(to.publicKey)
      );
      
      // Check if destination token account exists
      let transaction = new Transaction();
      
      try {
        await getAccount(this.connection, toTokenAddress);
      } catch (error) {
        // If account doesn't exist, create it
        transaction.add(
          createTransferInstruction(
            fromTokenAddress,
            toTokenAddress,
            new PublicKey(from.publicKey),
            Math.floor(amount * Math.pow(10, this.tokenDecimals))
          )
        );
      }
      
      // Add to transaction queue
      this.transactionQueue.enqueue(
        transaction,
        [from.keypair],
        {
          priority,
          onSuccess: (signature: TransactionSignature) => {
            console.log(`Trade executed: ${from.publicKey.substring(0, 8)}... -> ${to.publicKey.substring(0, 8)}... Amount: ${amount} tokens`);
            this.signatureTracker.track(signature);
          },
          onError: (error: Error) => {
            console.error(`Trade failed: ${from.publicKey.substring(0, 8)}... -> ${to.publicKey.substring(0, 8)}...`, error);
          }
        }
      );
    } catch (error) {
      console.error("Error executing trade:", error);
    }
  }
  
  /**
   * Get a random wallet from the list
   */
  private getRandomWallet(wallets: Wallet[] = this.wallets): Wallet {
    return wallets[Math.floor(Math.random() * wallets.length)];
  }
  
  /**
   * Get multiple random wallets from the list
   */
  private getRandomWallets(count: number, wallets: Wallet[] = this.wallets): Wallet[] {
    const shuffled = [...wallets].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  /**
   * Get a random pair of wallets
   */
  private getRandomPair(wallets: Wallet[] = this.wallets): [Wallet, Wallet] {
    const shuffled = [...wallets].sort(() => 0.5 - Math.random());
    return [shuffled[0], shuffled[1]];
  }
  
  /**
   * Get a random token amount between min and max percentage of total supply
   */
  private getRandomAmount(minPercentage: number, maxPercentage: number): number {
    const percentage = minPercentage + Math.random() * (maxPercentage - minPercentage);
    return 1_000_000_000 * percentage;
  }
  
  /**
   * Get current queue status
   */
  public getQueueStatus(): {
    queueLength: number;
    activeTransactions: number;
    isProcessing: boolean;
  } {
    return this.transactionQueue.getStatus();
  }
  
  /**
   * Get current trading status
   */
  public getTradingStatus(): {
    isRunning: boolean;
    currentPattern: TradingPatternType | null;
    remainingTime: number | null;
  } {
    let remainingTime = null;
    
    if (this.isRunning && this.currentPattern && this.patternTimeout) {
      const endTime = new Date().getTime() + this.currentPattern.duration;
      remainingTime = Math.max(0, endTime - new Date().getTime());
    }
    
    return {
      isRunning: this.isRunning,
      currentPattern: this.currentPattern?.type || null,
      remainingTime
    };
  }
} 