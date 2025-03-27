import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  Keypair,
  Signer
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { TokenDistribution, TransactionOptions, TRANSACTION_DEFAULTS } from '../types';
import { TransactionService } from './transactionService';
import { BalanceUtils } from '../utils/balanceUtils';
import { logger } from '../utils/logger';

export class TokenService {
  private connection: Connection;
  private transactionService: TransactionService;
  private balanceUtils: BalanceUtils;
  private logger = logger.child({ module: 'TokenService' });

  constructor(
    connection: Connection,
    transactionService: TransactionService,
    balanceUtils: BalanceUtils
  ) {
    this.connection = connection;
    this.transactionService = transactionService;
    this.balanceUtils = balanceUtils;
  }

  async createToken(
    payer: Keypair,
    mintAuthority: Keypair,
    decimals: number,
    freezeAuthority?: PublicKey
  ): Promise<PublicKey> {
    try {
      await this.balanceUtils.verifyBalance(payer.publicKey, TRANSACTION_DEFAULTS.ESTIMATED_FEE);

      const mint = await createMint(
        this.connection,
        payer,
        mintAuthority.publicKey,
        freezeAuthority || null,
        decimals,
        undefined,
        { commitment: TRANSACTION_DEFAULTS.COMMITMENT }
      );

      this.logger.info('Token created successfully', {
        mint: mint.toString(),
        decimals,
        mintAuthority: mintAuthority.publicKey.toString()
      });

      return mint;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error creating token', { error: errorMessage });
      throw error;
    }
  }

  async distributeTokens(
    distribution: TokenDistribution,
    mintAuthority: Keypair,
    options: TransactionOptions = {}
  ): Promise<string[]> {
    const signatures: string[] = [];
    const { mint, recipients } = distribution;
    const mergedOptions = { ...TRANSACTION_DEFAULTS, ...options };

    try {
      // Verify mint authority has enough SOL for all transactions
      const totalFee = TRANSACTION_DEFAULTS.ESTIMATED_FEE * recipients.length;
      await this.balanceUtils.verifyBalance(mintAuthority.publicKey, totalFee);

      for (const recipient of recipients) {
        try {
          // Get or create associated token account
          const recipientATA = await getOrCreateAssociatedTokenAccount(
            this.connection,
            mintAuthority,
            mint,
            recipient.address,
            true,
            mergedOptions.commitment
          );

          // Mint tokens to recipient
          const signature = await mintTo(
            this.connection,
            mintAuthority,
            mint,
            recipientATA.address,
            mintAuthority.publicKey,
            recipient.amount,
            [],
            { commitment: mergedOptions.commitment }
          );

          signatures.push(signature);
          
          this.logger.info('Tokens distributed successfully', {
            recipient: recipient.address.toString(),
            amount: recipient.amount,
            signature
          });

          // Add delay between transactions if specified
          if (mergedOptions.delayBetweenTransactions) {
            await new Promise(resolve => 
              setTimeout(resolve, mergedOptions.delayBetweenTransactions)
            );
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Error distributing tokens to recipient', {
            recipient: recipient.address.toString(),
            error: errorMessage
          });
          throw error;
        }
      }

      return signatures;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in token distribution', { error: errorMessage });
      throw error;
    }
  }

  async transferTokens(
    from: Keypair,
    to: PublicKey,
    mint: PublicKey,
    amount: number,
    options: TransactionOptions = {}
  ): Promise<string> {
    try {
      const mergedOptions = { ...TRANSACTION_DEFAULTS, ...options };

      // Verify sender has enough SOL for transaction
      await this.balanceUtils.verifyBalance(from.publicKey, TRANSACTION_DEFAULTS.ESTIMATED_FEE);

      // Get or create token accounts
      const fromATA = await getOrCreateAssociatedTokenAccount(
        this.connection,
        from,
        mint,
        from.publicKey,
        true,
        mergedOptions.commitment
      );

      const toATA = await getOrCreateAssociatedTokenAccount(
        this.connection,
        from,
        mint,
        to,
        true,
        mergedOptions.commitment
      );

      // Transfer tokens
      const signature = await transfer(
        this.connection,
        from,
        fromATA.address,
        toATA.address,
        from.publicKey,
        amount,
        [],
        { commitment: mergedOptions.commitment }
      );

      this.logger.info('Tokens transferred successfully', {
        from: from.publicKey.toString(),
        to: to.toString(),
        amount,
        signature
      });

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error transferring tokens', {
        from: from.publicKey.toString(),
        to: to.toString(),
        error: errorMessage
      });
      throw error;
    }
  }
} 