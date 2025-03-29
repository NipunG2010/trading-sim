import { Connection, PublicKey } from '@solana/web3.js';
import { CacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

// Valid test public keys
const TEST_PUBKEY = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'; // Valid token program ID
const TEST_ACCOUNT = '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT'; // Random valid pubkey
const TEST_OWNER = '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT';
const TEST_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint

// Mock Connection
class MockConnection {
  async getBalance(publicKey: PublicKey): Promise<number> {
    return 1000000000; // 1 SOL in lamports
  }

  async getTokenAccountsByOwner() {
    return {
      value: [{
        pubkey: new PublicKey(TEST_ACCOUNT),
        account: {
          owner: new PublicKey(TEST_OWNER),
          mint: new PublicKey(TEST_MINT),
          amount: 1000
        }
      }]
    };
  }
}

describe('CacheService', () => {
  let cacheService: CacheService;
  const testPublicKey = new PublicKey(TEST_PUBKEY);

  beforeAll(() => {
    // Mock logger to prevent test logs
    jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    jest.spyOn(logger, 'error').mockImplementation(() => logger);
  });

  beforeEach(() => {
    cacheService = new CacheService(new MockConnection() as unknown as Connection);
  });

  test('should cache balance requests', async () => {
    // First call - should miss cache
    const balance1 = await cacheService.getBalance(testPublicKey);
    expect(balance1).toBe(1000000000);

    // Second call - should hit cache
    const balance2 = await cacheService.getBalance(testPublicKey);
    expect(balance2).toBe(1000000000);
  });

  test('should cache token accounts', async () => {
    // First call - should miss cache
    const accounts1 = await cacheService.getTokenAccounts(testPublicKey);
    expect(accounts1.length).toBe(1);
    expect(accounts1[0].pubkey).toBe(TEST_ACCOUNT);

    // Second call - should hit cache
    const accounts2 = await cacheService.getTokenAccounts(testPublicKey);
    expect(accounts2.length).toBe(1);
  });

  test('should batch balance requests', async () => {
    const publicKeys = [
      new PublicKey(TEST_PUBKEY),
      new PublicKey(TEST_ACCOUNT)
    ];

    const balances = await cacheService.getMultipleBalances(publicKeys);
    expect(balances.size).toBe(2);
    expect(balances.get(publicKeys[0])).toBe(1000000000);
    expect(balances.get(publicKeys[1])).toBe(1000000000);
  });

  test('should invalidate cache', async () => {
    // Prime cache
    await cacheService.getBalance(testPublicKey);
    
    // Invalidate
    cacheService.invalidateBalance(testPublicKey);

    // Should miss cache after invalidation
    const balance = await cacheService.getBalance(testPublicKey);
    expect(balance).toBe(1000000000);
  });

  test('should handle errors gracefully', async () => {
    const errorConnection = {
      getBalance: jest.fn().mockRejectedValue(new Error('Network error')),
      getTokenAccountsByOwner: jest.fn().mockRejectedValue(new Error('Network error'))
    };

    const errorCacheService = new CacheService(errorConnection as unknown as Connection);

    await expect(errorCacheService.getBalance(testPublicKey))
      .rejects.toThrow('Network error');

    await expect(errorCacheService.getTokenAccounts(testPublicKey))
      .rejects.toThrow('Network error');
  });
});