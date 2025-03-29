declare module 'solana-agent-kit' {
  export class SolanaAgent {
    constructor(config: {
      network: 'mainnet' | 'devnet' | 'testnet'
      rpcEndpoint: string
      modules: string[]
    })
    
    createConnection(): Promise<any>
    generateKeypair(): Promise<{ publicKey: string, secretKey: Uint8Array }>
    normalizePublicKey(address: string): string
    execute(met hod: string, params: any): Promise<string>
  }

  export function createSolanaTools(): {
    transactions: any
    accounts: any
    tokens: any
  }
}