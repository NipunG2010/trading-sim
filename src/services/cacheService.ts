import { Connection, PublicKey } from '@solana/web3.js';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  checkperiod?: number; // Automatic delete check interval
}

export class CacheService {
  private cache: NodeCache;
  private connection: Connection;

  constructor(connection: Connection, options: CacheOptions = {}) {
    this.connection = connection;
    this.cache = new NodeCache({
      stdTTL: options.ttl || 30, // Default 30 second cache
      checkperiod: options.checkperiod || 60 // Check every 60 seconds
    });
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    const cacheKey = `balance-${publicKey.toString()}`;
    const cachedBalance = this.cache.get<number>(cacheKey);

    if (cachedBalance !== undefined) {
      logger.debug('Cache hit for balance', { publicKey: publicKey.toString() });
      return cachedBalance;
    }

    try {
      const balance = await this.connection.getBalance(publicKey);
      this.cache.set(cacheKey, balance);
      return balance;
    } catch (error) {
      logger.error('Error fetching balance', {
        publicKey: publicKey.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getTokenAccounts(owner: PublicKey): Promise<any[]> {
    const cacheKey = `token-accounts-${owner.toString()}`;
    const cachedAccounts = this.cache.get<any[]>(cacheKey);

    if (cachedAccounts !== undefined) {
      logger.debug('Cache hit for token accounts', { owner: owner.toString() });
      return cachedAccounts;
    }

    try {
      const accounts = await this.connection.getTokenAccountsByOwner(owner, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });
      const parsedAccounts = accounts.value.map(acc => ({
        pubkey: acc.pubkey.toString(),
        account: acc.account
      }));
      this.cache.set(cacheKey, parsedAccounts);
      return parsedAccounts;
    } catch (error) {
      logger.error('Error fetching token accounts', {
        owner: owner.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getMultipleBalances(publicKeys: PublicKey[]): Promise<Map<PublicKey, number>> {
    const results = new Map<PublicKey, number>();
    const uncachedKeys: PublicKey[] = [];

    // Check cache first
    publicKeys.forEach(key => {
      const cacheKey = `balance-${key.toString()}`;
      const cached = this.cache.get<number>(cacheKey);
      if (cached !== undefined) {
        results.set(key, cached);
      } else {
        uncachedKeys.push(key);
      }
    });

    // Batch fetch uncached balances
    if (uncachedKeys.length > 0) {
      try {
        const balances = await Promise.all(
          uncachedKeys.map(key => this.connection.getBalance(key))
        );

        uncachedKeys.forEach((key, index) => {
          const balance = balances[index];
          const cacheKey = `balance-${key.toString()}`;
          this.cache.set(cacheKey, balance);
          results.set(key, balance);
        });
      } catch (error) {
        logger.error('Error batch fetching balances', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }

    return results;
  }

  invalidateBalance(publicKey: PublicKey): void {
    const cacheKey = `balance-${publicKey.toString()}`;
    this.cache.del(cacheKey);
  }

  invalidateTokenAccounts(owner: PublicKey): void {
    const cacheKey = `token-accounts-${owner.toString()}`;
    this.cache.del(cacheKey);
  }
}