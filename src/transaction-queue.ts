import { 
  Connection, 
  Transaction, 
  TransactionSignature, 
  Signer, 
  PublicKey,
  sendAndConfirmTransaction,
  SendTransactionError,
  Commitment
} from "@solana/web3.js";

// Transaction queue configuration
interface TransactionQueueConfig {
  maxConcurrent: number;
  retryLimit: number;
  retryDelay: number; // in milliseconds
  priorityLevels: {
    high: number;
    medium: number;
    low: number;
  };
}

// Default configuration
const DEFAULT_CONFIG: TransactionQueueConfig = {
  maxConcurrent: 5,
  retryLimit: 3,
  retryDelay: 2000,
  priorityLevels: {
    high: 0,
    medium: 500,
    low: 1000
  }
};

// Transaction priority
export type TransactionPriority = 'high' | 'medium' | 'low';

// Transaction item in the queue
interface QueueItem {
  transaction: Transaction;
  signers: Signer[];
  priority: TransactionPriority;
  retries: number;
  onSuccess?: (signature: TransactionSignature) => void;
  onError?: (error: Error) => void;
  commitment?: Commitment;
}

/**
 * Transaction Queue for managing Solana transactions
 * - Handles rate limiting
 * - Implements retry logic
 * - Supports transaction prioritization
 * - Tracks transaction status
 */
export class TransactionQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private activeTransactions: number = 0;
  private config: TransactionQueueConfig;
  private connection: Connection;
  
  constructor(connection: Connection, config: Partial<TransactionQueueConfig> = {}) {
    this.connection = connection;
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log(`Transaction Queue initialized with max ${this.config.maxConcurrent} concurrent transactions`);
  }
  
  /**
   * Add a transaction to the queue
   */
  public enqueue(
    transaction: Transaction,
    signers: Signer[],
    options: {
      priority?: TransactionPriority,
      onSuccess?: (signature: TransactionSignature) => void,
      onError?: (error: Error) => void,
      commitment?: Commitment
    } = {}
  ): void {
    const { priority = 'medium', onSuccess, onError, commitment = 'confirmed' } = options;
    
    this.queue.push({
      transaction,
      signers,
      priority,
      retries: 0,
      onSuccess,
      onError,
      commitment
    });
    
    console.log(`Transaction added to queue with ${priority} priority. Queue size: ${this.queue.length}`);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  /**
   * Process the transaction queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    console.log(`Starting queue processing. Queue size: ${this.queue.length}`);
    
    while (this.queue.length > 0 && this.activeTransactions < this.config.maxConcurrent) {
      // Sort queue by priority
      this.queue.sort((a, b) => {
        const priorityA = this.config.priorityLevels[a.priority];
        const priorityB = this.config.priorityLevels[b.priority];
        return priorityA - priorityB;
      });
      
      // Get next transaction
      const item = this.queue.shift();
      if (!item) continue;
      
      this.activeTransactions++;
      
      // Process transaction asynchronously
      this.processTransaction(item).finally(() => {
        this.activeTransactions--;
        // Continue processing if there are more items
        if (this.queue.length > 0 && !this.processing) {
          this.processQueue();
        }
      });
      
      // If we've reached max concurrent, wait for some to complete
      if (this.activeTransactions >= this.config.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.processing = false;
    
    // If queue is empty, log completion
    if (this.queue.length === 0 && this.activeTransactions === 0) {
      console.log("Transaction queue processing complete");
    }
  }
  
  /**
   * Process a single transaction with retry logic
   */
  private async processTransaction(item: QueueItem): Promise<void> {
    const { transaction, signers, priority, retries, onSuccess, onError, commitment } = item;
    
    try {
      console.log(`Processing ${priority} priority transaction (attempt ${retries + 1})`);
      
      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        signers,
        {
          commitment
        }
      );
      
      console.log(`Transaction successful: ${signature}`);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (error) {
      console.error(`Transaction failed (attempt ${retries + 1}):`, error);
      
      // Check if we should retry
      if (retries < this.config.retryLimit) {
        console.log(`Retrying transaction in ${this.config.retryDelay}ms...`);
        
        // Add back to queue with incremented retry count
        setTimeout(() => {
          this.queue.push({
            ...item,
            retries: retries + 1
          });
          
          // Restart queue processing if needed
          if (!this.processing) {
            this.processQueue();
          }
        }, this.config.retryDelay);
      } else {
        console.error(`Transaction failed after ${retries + 1} attempts, giving up.`);
        
        // Call error callback if provided
        if (onError) {
          onError(error as Error);
        }
      }
    }
  }
  
  /**
   * Get current queue status
   */
  public getStatus(): {
    queueLength: number;
    activeTransactions: number;
    isProcessing: boolean;
  } {
    return {
      queueLength: this.queue.length,
      activeTransactions: this.activeTransactions,
      isProcessing: this.processing
    };
  }
  
  /**
   * Clear the queue
   */
  public clear(): void {
    const queueLength = this.queue.length;
    this.queue = [];
    console.log(`Queue cleared. ${queueLength} transactions removed.`);
  }
}

// Signature status tracker
export class SignatureStatusTracker {
  private signatures: Map<string, {
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations: number;
    slot?: number;
    error?: Error;
  }> = new Map();
  
  private connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Add a signature to track
   */
  public track(signature: TransactionSignature): void {
    this.signatures.set(signature, {
      status: 'pending',
      confirmations: 0
    });
    
    // Start tracking
    this.checkStatus(signature);
  }
  
  /**
   * Check status of a signature
   */
  private async checkStatus(signature: TransactionSignature): Promise<void> {
    try {
      // Get signature status
      const status = await this.connection.getSignatureStatus(signature);
      
      if (!status || !status.value) {
        // Transaction not found yet, retry in 2 seconds
        setTimeout(() => this.checkStatus(signature), 2000);
        return;
      }
      
      const { confirmations, confirmationStatus, slot, err } = status.value;
      
      // Update status
      if (err) {
        this.signatures.set(signature, {
          status: 'failed',
          confirmations: confirmations || 0,
          slot,
          error: new Error(JSON.stringify(err))
        });
        console.error(`Transaction ${signature} failed:`, err);
      } else {
        let statusValue: 'pending' | 'confirmed' | 'finalized';
        
        switch (confirmationStatus) {
          case 'finalized':
            statusValue = 'finalized';
            break;
          case 'confirmed':
            statusValue = 'confirmed';
            break;
          default:
            statusValue = 'pending';
        }
        
        this.signatures.set(signature, {
          status: statusValue,
          confirmations: confirmations || 0,
          slot
        });
        
        // If not finalized, continue checking
        if (statusValue !== 'finalized') {
          setTimeout(() => this.checkStatus(signature), 2000);
        } else {
          console.log(`Transaction ${signature} finalized at slot ${slot}`);
        }
      }
    } catch (error) {
      console.error(`Error checking signature ${signature}:`, error);
      // Retry in 5 seconds
      setTimeout(() => this.checkStatus(signature), 5000);
    }
  }
  
  /**
   * Get status of a signature
   */
  public getStatus(signature: TransactionSignature): {
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations: number;
    slot?: number;
    error?: Error;
  } | undefined {
    return this.signatures.get(signature);
  }
  
  /**
   * Get all tracked signatures
   */
  public getAllSignatures(): Map<string, {
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations: number;
    slot?: number;
    error?: Error;
  }> {
    return new Map(this.signatures);
  }
}

// Gas price optimization
export class GasPriceOptimizer {
  private connection: Connection;
  private recentPrices: number[] = [];
  private lastUpdate: number = 0;
  private updateInterval: number = 60000; // 1 minute
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Get current gas price estimate
   */
  public async getGasPrice(priority: TransactionPriority = 'medium'): Promise<number> {
    // Update prices if needed
    if (Date.now() - this.lastUpdate > this.updateInterval || this.recentPrices.length === 0) {
      await this.updateGasPrices();
    }
    
    // Calculate price based on priority
    if (this.recentPrices.length === 0) {
      // Default to Solana's minimum if we have no data
      return 5000;
    }
    
    const median = this.calculateMedian(this.recentPrices);
    
    switch (priority) {
      case 'high':
        return Math.ceil(median * 1.5);
      case 'low':
        return Math.ceil(median * 0.8);
      case 'medium':
      default:
        return Math.ceil(median);
    }
  }
  
  /**
   * Update gas price estimates
   */
  private async updateGasPrices(): Promise<void> {
    try {
      // Get recent prioritization fees
      const blocks = await this.connection.getRecentPrioritizationFees();
      
      // Extract fees
      const fees = blocks.map(block => block.prioritizationFee);
      
      // Store recent prices
      this.recentPrices = fees;
      this.lastUpdate = Date.now();
      
      console.log(`Updated gas prices. Median: ${this.calculateMedian(fees)}`);
    } catch (error) {
      console.error("Error updating gas prices:", error);
    }
  }
  
  /**
   * Calculate median of an array
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }
} 