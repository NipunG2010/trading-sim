import { PublicKey, Commitment } from '@solana/web3.js';

export interface TransactionWithSignature {
  signature: string;
  confirmationStatus?: string;
}

export interface WalletBalance {
  publicKey: PublicKey;
  balance: number;
  tokenBalance?: number;
}

export interface TransactionLog {
  signature: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface TransactionOptions {
  commitment?: Commitment;
  maxRetries?: number;
  initialDelay?: number;
  delayBetweenTransactions?: number;
}

export interface TokenDistribution {
  mint: PublicKey;
  recipients: {
    address: PublicKey;
    amount: number;
  }[];
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export const TRANSACTION_DEFAULTS = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  MAX_BATCH_SIZE: 10,
  COMMITMENT: 'confirmed' as Commitment,
  ESTIMATED_FEE: 0.000005, // SOL
  DELAY_BETWEEN_TRANSACTIONS: 1000, // ms
} as const; 