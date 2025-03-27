// Type declarations
declare const require: (module: string) => any;
declare const module: { exports: any };

// Runtime imports
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const fs = require('fs');
const { Buffer } = require('buffer');
const { createLogger } = require('./logger');

// Type imports
type Connection = typeof web3.Connection;
type Keypair = typeof web3.Keypair;
type PublicKey = typeof web3.PublicKey;
type Transaction = typeof web3.Transaction;
type BufferType = typeof Buffer;

const logger = createLogger('TokenService');


export class TokenService {
  loadAccounts(): Account[] {
    try {
      return JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
    } catch (error) {
      logger.error('Error loading accounts:', error);
      throw error;
    }
  }

  loadTokenInfo(): TokenInfo {
    try {
      if (fs.existsSync('token-info.json')) {
        return JSON.parse(fs.readFileSync('token-info.json', 'utf-8'));
      } else if (fs.existsSync('public/token-info.json')) {
        return JSON.parse(fs.readFileSync('public/token-info.json', 'utf-8'));
      } else if (fs.existsSync('../token-info.json')) {
        return JSON.parse(fs.readFileSync('../token-info.json', 'utf-8'));
      } else if (fs.existsSync('../public/token-info.json')) {
        return JSON.parse(fs.readFileSync('../public/token-info.json', 'utf-8'));
      } else {
        logger.error('Error: token-info.json not found in any expected location');
        return {
          mint: '',
          name: 'Unknown Token',
          symbol: 'UNK',
          decimals: 9,
          totalSupply: 1000000000
        };
      }
    } catch (error) {
      logger.error('Error loading token info:', error);
      return {
        mint: '',
        name: 'Unknown Token',
        symbol: 'UNK',
        decimals: 9,
        totalSupply: 1000000000
      };
    }
  }

  createKeypairFromSecretKey(secretKey: number[] | string | Uint8Array | BufferType): Keypair {
    try {
      if (typeof secretKey === 'string') {
        return web3.Keypair.fromSecretKey(Buffer.from(secretKey, 'base64'));
      } else if (Array.isArray(secretKey)) {
        return web3.Keypair.fromSecretKey(Uint8Array.from(secretKey));
      } else if (secretKey instanceof Uint8Array) {
        return web3.Keypair.fromSecretKey(secretKey);
      } else if (Buffer.isBuffer(secretKey)) {
        return web3.Keypair.fromSecretKey(secretKey);
      } else {
        throw new Error(`Unsupported secret key format: ${typeof secretKey}`);
      }
    } catch (error) {
      logger.error(`Error creating keypair: ${error}`);
      throw error;
    }
  }

  async transferTokens(
    connection: Connection,
    senderKeypair: Keypair,
    receiverPublicKey: PublicKey,
    tokenMint: PublicKey,
    amount: number,
    decimals: number
  ): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const senderTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
          connection,
          senderKeypair,
          tokenMint,
          senderKeypair.publicKey
        );
        
        const receiverTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
          connection,
          senderKeypair,
          tokenMint,
          receiverPublicKey
        );
        
        const transferInstruction = splToken.createTransferInstruction(
          senderTokenAccount.address,
          receiverTokenAccount.address,
          senderKeypair.publicKey,
          amount * (10 ** decimals)
        );
        
        const transaction = new web3.Transaction().add(transferInstruction);
        const signature = await connection.sendTransaction(transaction, [senderKeypair]);
        
        return signature;
      } catch (error) {
        attempts++;
        logger.error(`Transfer attempt ${attempts}/${maxAttempts} failed: ${error}`);
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to transfer tokens after ${maxAttempts} attempts: ${error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    throw new Error('Transfer failed after maximum attempts');
  }
}

export interface Account {
  publicKey: string;
  secretKey: number[] | string;
  type: 'whale' | 'retail';
}

export interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
}

export default new TokenService();