import { randomBytes } from 'crypto';
import { createLogger } from '../src/services/logger';

const logger = createLogger('KeyGenerator');

function generateEncryptionKey(): string {
  try {
    // Generate a 32-byte (256-bit) random key
    const key = randomBytes(32);
    const hexKey = key.toString('hex');
    
    logger.info('Generated new encryption key');
    console.log('\nEncryption Key (add to .env file):\n');
    console.log(`WALLET_ENCRYPTION_KEY=${hexKey}\n`);
    
    return hexKey;
  } catch (error) {
    logger.error('Failed to generate encryption key', error);
    throw new Error('Failed to generate encryption key');
  }
}

// Generate and display the key if this script is run directly
if (require.main === module) {
  generateEncryptionKey();
}

export { generateEncryptionKey }; 