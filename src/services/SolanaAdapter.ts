import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { SolanaAgentService } from './SolanaAgentService';
import { TradingPatternConfig } from '../types';
import { z } from 'zod';

const KeypairSchema = z.object({
  publicKey: z.string(),
  secretKey: z.instanceof(Uint8Array)
});

export interface ISolanaAdapter {
  createConnection(): Promise<Connection>;
  generateKeypair(): Promise<Keypair>;
  executeTrade(pattern: TradingPatternConfig, wallet: Keypair): Promise<string>;
}

export class HybridSolanaAdapter implements ISolanaAdapter {
  private agentService?: SolanaAgentService;
  private useAgent: boolean;
  private rpcEndpoint: string;

  constructor(
    rpcEndpoint: string, 
    network: 'mainnet' | 'devnet' | 'testnet',
    useAgent: boolean = true
  ) {
    this.rpcEndpoint = rpcEndpoint;
    this.useAgent = useAgent;
    
    if (useAgent) {
      this.agentService = new SolanaAgentService(rpcEndpoint, network);
    }
  }

  async createConnection(): Promise<Connection> {
    if (this.useAgent && this.agentService) {
      const conn = await this.agentService.getConnection();
      return new Connection(conn.rpcEndpoint);
    }
    return new Connection(this.rpcEndpoint);
  }

  async generateKeypair(): Promise<Keypair> {
    if (this.useAgent && this.agentService) {
      const kp = await this.agentService.generateKeypair();
      const validated = KeypairSchema.parse(kp);
      return Keypair.fromSecretKey(validated.secretKey);
    }
    return Keypair.generate();
  }

  async executeTrade(pattern: TradingPatternConfig, wallet: Keypair): Promise<string> {
    if (this.useAgent && this.agentService) {
      return this.agentService.executeTrade(pattern, {
        publicKey: wallet.publicKey.toString(),
        secretKey: wallet.secretKey
      });
    }
    throw new Error('Legacy execution not implemented');
  }
}