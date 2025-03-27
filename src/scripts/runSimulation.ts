import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TradingSimulator } from '../trading';
import { logger } from '../trading/utils/logger';

async function main() {
  try {
    // Initialize connection
    const connection = new Connection(
      'https://api.devnet.solana.com',
      'confirmed'
    );

    // Load payer from environment or generate new one
    const payer = process.env.PAYER_PRIVATE_KEY
      ? Keypair.fromSecretKey(
          Buffer.from(process.env.PAYER_PRIVATE_KEY, 'base64')
        )
      : Keypair.generate();

    // Generate trading wallets
    const numWallets = 50;
    const tradingWallets = Array.from(
      { length: numWallets },
      () => Keypair.generate()
    );

    // Generate profit wallet
    const profitWallet = Keypair.generate();

    // Initialize simulator with custom configuration
    const simulator = new TradingSimulator(connection, payer, {
      patternDuration: 48 * 60 * 60 * 1000, // 48 hours
      profitAnalysisInterval: 5 * 60 * 1000, // 5 minutes
      minProfitThreshold: 0.02, // 2%
      maxLossThreshold: 0.01, // 1%
      tradeSize: 1000
    });

    // Load or create token mint
    const mint = process.env.TOKEN_MINT
      ? new PublicKey(process.env.TOKEN_MINT)
      : Keypair.generate().publicKey;

    logger.info('Starting trading simulation', {
      network: 'devnet',
      mint: mint.toString(),
      wallets: numWallets
    });

    // Start simulation
    await simulator.start(mint, tradingWallets, profitWallet);

    // Set up status monitoring
    const statusInterval = setInterval(() => {
      const status = simulator.getStatus();
      logger.info('Simulation status', {
        isRunning: status.isRunning,
        opportunities: status.opportunities,
        detectedBots: status.detectedBots
      });
    }, 60000); // Check status every minute

    // Handle cleanup on process termination
    process.on('SIGINT', async () => {
      clearInterval(statusInterval);
      await simulator.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      clearInterval(statusInterval);
      await simulator.stop();
      process.exit(0);
    });

    // Log initial wallet information
    logger.info('Wallet information', {
      payer: payer.publicKey.toString(),
      profitWallet: profitWallet.publicKey.toString(),
      tradingWallets: tradingWallets.map(w => w.publicKey.toString())
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error running simulation', { error: errorMessage });
    process.exit(1);
  }
}

main(); 