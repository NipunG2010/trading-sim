import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { calculateTradingConstants } from '../constants/TradingConstants';

interface WalletInfo {
  keypair: Keypair;
  balance: number;
  lastTradeTime: number;
  lastBlockNumber: number;
  type: 'whale' | 'retail';
  lastBalanceCheck: number;
}

export class WalletService {
  private connection: Connection;
  private wallets: Map<string, WalletInfo> = new Map();
  private whaleWallets: string[] = [];
  private retailWallets: string[] = [];
  private tradingConstants: ReturnType<typeof calculateTradingConstants>;
  private lastBlockNumber: number = 0;
  private blockNumberTimestamp: number = 0;
  private readonly BLOCK_CACHE_TIME = 500; // 500ms cache
  private readonly BALANCE_CACHE_TIME = 2000; // 2s cache

  constructor(connection: Connection) {
    this.connection = connection;
    this.tradingConstants = calculateTradingConstants({
      totalFunding: 0,
      marketCap: 0,
      liquidity: 0,
      averageBalance: 0
    });
  }

  async loadWallets(walletKeypairs: Keypair[]): Promise<void> {
    this.wallets.clear();
    this.whaleWallets = [];
    this.retailWallets = [];

    const currentBlockNumber = await this.getCurrentBlockNumber();
    const now = Date.now();

    // Batch initialize wallets
    const whaleCount = Math.floor(walletKeypairs.length * 0.4);
    
    await Promise.all(walletKeypairs.map(async (keypair, i) => {
      const type = i < whaleCount ? 'whale' : 'retail';
      const address = keypair.publicKey.toString();
      
      // Get initial balance
      const balance = await this.connection.getBalance(keypair.publicKey)
        .then(bal => bal / 1e9)
        .catch(() => 0);

      const walletInfo: WalletInfo = {
        keypair,
        balance,
        lastTradeTime: 0,
        lastBlockNumber: currentBlockNumber,
        lastBalanceCheck: now,
        type
      };

      this.wallets.set(address, walletInfo);
      
      if (type === 'whale') {
        this.whaleWallets.push(address);
      } else {
        this.retailWallets.push(address);
      }
    }));
  }

  private async getCurrentBlockNumber(): Promise<number> {
    const now = Date.now();
    if (now - this.blockNumberTimestamp < this.BLOCK_CACHE_TIME) {
      return this.lastBlockNumber;
    }

    try {
      this.lastBlockNumber = await this.connection.getSlot();
      this.blockNumberTimestamp = now;
      return this.lastBlockNumber;
    } catch (error) {
      console.error('Error getting current block number:', error);
      return this.lastBlockNumber;
    }
  }

  async getWalletBalance(walletAddress: string): Promise<number> {
    const walletInfo = this.wallets.get(walletAddress);
    if (!walletInfo) return 0;

    const now = Date.now();
    if (now - walletInfo.lastBalanceCheck < this.BALANCE_CACHE_TIME) {
      return walletInfo.balance;
    }

    try {
      const balance = await this.connection.getBalance(walletInfo.keypair.publicKey);
      walletInfo.balance = balance / 1e9;
      walletInfo.lastBalanceCheck = now;
      return walletInfo.balance;
    } catch (error) {
      console.error(`Error updating balance for wallet ${walletAddress}:`, error);
      return walletInfo.balance;
    }
  }

  async isWalletAvailableForBlock(walletAddress: string): Promise<boolean> {
    const walletInfo = this.wallets.get(walletAddress);
    if (!walletInfo) return false;

    const currentBlock = await this.getCurrentBlockNumber();
    return currentBlock > walletInfo.lastBlockNumber;
  }

  async updateWalletBlockNumber(walletAddress: string): Promise<void> {
    const walletInfo = this.wallets.get(walletAddress);
    if (walletInfo) {
      walletInfo.lastBlockNumber = await this.getCurrentBlockNumber();
    }
  }

  async getAvailableWallet(
    minBalance: number,
    type?: 'whale' | 'retail'
  ): Promise<WalletInfo | null> {
    const walletAddresses = type
      ? type === 'whale' ? this.whaleWallets : this.retailWallets
      : [...this.wallets.keys()];

    // Randomly shuffle to prevent sequential scanning
    const shuffled = [...walletAddresses].sort(() => Math.random() - 0.5);

    const currentTime = Date.now();
    const minTimeBetweenTrades = this.tradingConstants.SAFETY.MIN_TIME_BETWEEN_TRADES_MS;

    // Check wallets in parallel
    const availableWallets = await Promise.all(
      shuffled.map(async address => {
        const walletInfo = this.wallets.get(address);
        if (!walletInfo) return null;

        const balance = await this.getWalletBalance(address);
        const isAvailable = balance >= minBalance &&
          currentTime - walletInfo.lastTradeTime >= minTimeBetweenTrades &&
          await this.isWalletAvailableForBlock(address);

        return isAvailable ? walletInfo : null;
      })
    );

    return availableWallets.find(wallet => wallet !== null) || null;
  }

  getRandomWallets(count: number, type?: 'whale' | 'retail'): WalletInfo[] {
    const walletAddresses = type
      ? type === 'whale' ? this.whaleWallets : this.retailWallets
      : [...this.wallets.keys()];

    // Shuffle wallet addresses
    const shuffled = [...walletAddresses].sort(() => Math.random() - 0.5);
    
    // Take requested number of wallets
    return shuffled
      .slice(0, count)
      .map(address => this.wallets.get(address)!)
      .filter(wallet => wallet !== undefined);
  }

  updateLastTradeTime(walletAddress: string): void {
    const walletInfo = this.wallets.get(walletAddress);
    if (walletInfo) {
      walletInfo.lastTradeTime = Date.now();
    }
  }

  getWalletType(walletAddress: string): 'whale' | 'retail' | undefined {
    return this.wallets.get(walletAddress)?.type;
  }

  getTotalBalance(): number {
    let total = 0;
    for (const walletInfo of this.wallets.values()) {
      total += walletInfo.balance;
    }
    return total;
  }

  getWalletCount(type?: 'whale' | 'retail'): number {
    if (!type) {
      return this.wallets.size;
    }
    return type === 'whale' ? this.whaleWallets.length : this.retailWallets.length;
  }

  async distributeSOL(
    sourceWallet: Keypair,
    amountPerWallet: number
  ): Promise<boolean> {
    try {
      // Here you would implement SOL distribution logic
      // For now, just simulate the distribution
      for (const walletInfo of this.wallets.values()) {
        walletInfo.balance = amountPerWallet;
      }
      return true;
    } catch (error) {
      console.error('Error distributing SOL:', error);
      return false;
    }
  }

  // Helper method to check if a wallet is available for trading
  isWalletAvailable(walletAddress: string, minBalance: number): boolean {
    const walletInfo = this.wallets.get(walletAddress);
    if (!walletInfo) return false;

    const currentTime = Date.now();
    return walletInfo.balance >= minBalance &&
           currentTime - walletInfo.lastTradeTime >= this.tradingConstants.SAFETY.MIN_TIME_BETWEEN_TRADES_MS;
  }

  // Add method to update trading constants
  updateTradingConstants(metrics: Parameters<typeof calculateTradingConstants>[0]): void {
    this.tradingConstants = calculateTradingConstants(metrics);
  }
} 