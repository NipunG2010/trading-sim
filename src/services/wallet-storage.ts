import { Keypair } from '@solana/web3.js';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import config from '../config';
import { createLogger } from './logger';

const logger = createLogger('WalletStorageService');

interface FileSystemError extends Error {
  code?: string;
}

interface EncryptedWallet {
  iv: string;
  encryptedData: string;
}

export class WalletStorageService {
  private readonly encryptionKey: Buffer;
  private readonly storagePath: string;

  constructor() {
    if (!config.security.walletEncryptionKey) {
      logger.error('Wallet encryption key is not configured');
      throw new Error('Wallet encryption key is not configured');
    }

    this.encryptionKey = Buffer.from(config.security.walletEncryptionKey, 'hex');
    this.storagePath = config.security.secureStoragePath;

    // Ensure storage directory exists
    if (!fs.existsSync(this.storagePath)) {
      logger.info(`Creating secure storage directory at ${this.storagePath}`);
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async storeWallet(walletId: string, keypair: Keypair): Promise<void> {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

      const walletData = JSON.stringify({
        publicKey: keypair.publicKey.toString(),
        secretKey: Array.from(keypair.secretKey),
      });

      let encryptedData = cipher.update(walletData, 'utf8', 'hex');
      encryptedData += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const encryptedWallet: EncryptedWallet = {
        iv: iv.toString('hex'),
        encryptedData: encryptedData + authTag.toString('hex'),
      };

      const filePath = path.join(this.storagePath, `${walletId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(encryptedWallet));
      logger.info(`Wallet ${walletId} stored successfully`);
    } catch (error) {
      logger.error('Failed to store wallet', error);
      throw new Error('Failed to store wallet');
    }
  }

  async retrieveWallet(walletId: string): Promise<Keypair> {
    try {
      const filePath = path.join(this.storagePath, `${walletId}.json`);
      const fileData = await fs.promises.readFile(filePath, 'utf8');
      const encryptedWallet: EncryptedWallet = JSON.parse(fileData);

      const iv = Buffer.from(encryptedWallet.iv, 'hex');
      const encryptedData = encryptedWallet.encryptedData;
      const authTag = Buffer.from(encryptedData.slice(-32), 'hex');
      const encryptedText = encryptedData.slice(0, -32);

      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decryptedData = decipher.update(encryptedText, 'hex', 'utf8');
      decryptedData += decipher.final('utf8');

      const walletData = JSON.parse(decryptedData);
      logger.info(`Wallet ${walletId} retrieved successfully`);
      return Keypair.fromSecretKey(Uint8Array.from(walletData.secretKey));
    } catch (error) {
      logger.error(`Failed to retrieve wallet ${walletId}`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve wallet: ${error.message}`);
      }
      throw new Error('Failed to retrieve wallet');
    }
  }

  async deleteWallet(walletId: string): Promise<void> {
    try {
      const filePath = path.join(this.storagePath, `${walletId}.json`);
      await fs.promises.unlink(filePath);
      logger.info(`Wallet ${walletId} deleted successfully`);
    } catch (error) {
      const fsError = error as FileSystemError;
      if (fsError.code === 'ENOENT') {
        logger.warn(`Wallet ${walletId} not found for deletion`);
        return;
      }
      logger.error(`Failed to delete wallet ${walletId}`, error);
      throw new Error('Failed to delete wallet');
    }
  }

  async listWallets(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.storagePath);
      const walletIds = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      logger.debug(`Found ${walletIds.length} wallets`);
      return walletIds;
    } catch (error) {
      logger.error('Failed to list wallets', error);
      throw new Error('Failed to list wallets');
    }
  }
}

export default new WalletStorageService(); 