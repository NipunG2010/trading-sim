import dotenvSafe from 'dotenv-safe';
import path from 'path';

// Load environment variables
dotenvSafe.config();

const config = {
  server: {
    port: process.env.PORT || 3000,
  },

  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
  },

  security: {
    walletEncryptionKey: process.env.WALLET_ENCRYPTION_KEY,
    secureStoragePath: path.join(process.cwd(), 'secure-storage'),
    rateLimit: {
      max: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: path.join(process.cwd(), 'logs', 'app.log'),
  },

  validation: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },
};

export default config; 