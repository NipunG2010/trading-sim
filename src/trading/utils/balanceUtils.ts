// Issue: Missing pre-transaction balance checks
// Solution: Add balance verification

import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { WalletBalance, TRANSACTION_DEFAULTS } from '../types';
import { logger } from './logger';

export class BalanceUtils {
  private connection: Connection;
  private logger = logger.child({ module: 'BalanceUtils' });

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async verifyBalance(
    wallet: PublicKey, 
    amount: number, 
    options: { includeTokenBalance?: boolean } = {}
  ): Promise<WalletBalance> {
    try {
      const solBalance = await this.connection.getBalance(wallet);
      const requiredBalance = amount + TRANSACTION_DEFAULTS.ESTIMATED_FEE;
      
      const balance: WalletBalance = {
        publicKey: wallet,
        balance: solBalance / 1e9, // Convert lamports to SOL
      };

      if (options.includeTokenBalance) {
        const tokenAccounts = await this.connection.getTokenAccountsByOwner(wallet, {
          programId: TOKEN_PROGRAM_ID,
        });

        if (tokenAccounts.value.length > 0) {
          const tokenBalance = await this.connection.getTokenAccountBalance(
            tokenAccounts.value[0].pubkey
          );
          balance.tokenBalance = Number(tokenBalance.value.amount) / Math.pow(10, tokenBalance.value.decimals);
        }
      }

      if (balance.balance < requiredBalance) {
        this.logger.warn('Insufficient balance', {
          wallet: wallet.toString(),
          required: requiredBalance,
          actual: balance.balance
        });
        throw new Error(`Insufficient balance for transaction. Required: ${requiredBalance} SOL, Available: ${balance.balance} SOL`);
      }

      return balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error verifying balance', {
        wallet: wallet.toString(),
        error: errorMessage
      });
      throw error;
    }
  }

  async getMultipleBalances(wallets: PublicKey[]): Promise<WalletBalance[]> {
    try {
      const balances = await Promise.all(
        wallets.map(wallet => this.verifyBalance(wallet, 0, { includeTokenBalance: true }))
      );

      return balances;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching multiple balances', { error: errorMessage });
      throw error;
    }
  }

  async waitForBalance(
    wallet: PublicKey, 
    requiredBalance: number, 
    timeout: number = 60000
  ): Promise<WalletBalance> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const balance = await this.verifyBalance(wallet, requiredBalance);
        if (balance.balance >= requiredBalance) {
          return balance;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Continue waiting if it's just insufficient balance
        if (!(error instanceof Error && error.message.includes('Insufficient balance'))) {
          throw error;
        }
      }
    }
    
    throw new Error(`Timeout waiting for balance. Required: ${requiredBalance} SOL`);
  }
} 