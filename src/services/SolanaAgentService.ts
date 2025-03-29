import { z } from 'zod';
import { SolanaAgent } from 'solana-agent-kit';
import { TradingPatternConfig } from '../types';

// Zod schemas for validation
const PublicKeySchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const KeypairSchema = z.object({
  publicKey: PublicKeySchema,
  secretKey: z.instanceof(Uint8Array)
});

export class SolanaAgentService {
  private agent: SolanaAgent;
  private connectionCache: Map<string, any> = new Map();

  constructor(
    private readonly rpcEndpoint: string,
    private readonly network: 'mainnet' | 'devnet' | 'testnet'
  ) {
    this.agent = new SolanaAgent({
      network,
      rpcEndpoint,
      modules: ['transactions', 'accounts', 'tokens', 'monitoring'],
      security: {
        keyRotation: true,
        multiSig: true
      }
    });
  }

  async getConnection() {
    const cacheKey = `${this.network}:${this.rpcEndpoint}`;
    if (!this.connectionCache.has(cacheKey)) {
      const connection = await this.agent.createConnection();
      this.connectionCache.set(cacheKey, connection);
    }
    return this.connectionCache.get(cacheKey);
  }

  async generateKeypair(): Promise<z.infer<typeof KeypairSchema>> {
    const keypair = await this.agent.generateKeypair({
      securityLevel: 'high',
      rotationPolicy: 'weekly'
    });
    return KeypairSchema.parse(keypair);
  }

  async executeTrade(
    pattern: TradingPatternConfig,
    wallet: z.infer<typeof KeypairSchema>
  ): Promise<string> {
    const validatedWallet = KeypairSchema.parse(wallet);
    return this.agent.execute('trading-pattern', {
      patternConfig: pattern,
      wallet: validatedWallet,
      gasOptimization: true,
      retryPolicy: {
        maxAttempts: 3,
        delayMs: 2000
      }
    });
  }

  async monitorBlockchainState(callback: (event: any) => void) {
    return this.agent.monitor('blockchain-state', {
      callback,
      filters: ['account-changes', 'transaction-events']
    });
  }
}