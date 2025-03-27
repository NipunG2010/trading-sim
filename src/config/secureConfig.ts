import dotenv from 'dotenv';
import CryptoJS from 'crypto-js';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Type declarations for Node.js crypto module
declare global {
  interface Crypto {
    randomBytes?(length: number): Buffer;
    createCipheriv?(algorithm: string, key: Buffer, iv: Buffer): any;
    createDecipheriv?(algorithm: string, key: Buffer, iv: Buffer): any;
  }
}

// Use native crypto if available, otherwise fallback to crypto-js
const crypto: Crypto = globalThis.crypto || require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  (crypto.randomBytes ? crypto.randomBytes(32).toString('hex') : 
  CryptoJS.lib.WordArray.random(32).toString());

const IV_LENGTH = 16;

export interface SecureConfig {
  set(key: string, value: string): void;
  get(key: string): string | null;
  getAll(): Record<string, string>;
}

class SecureConfigImpl implements SecureConfig {
  private configPath: string;
  private encryptedData: Record<string, string> = {};

  constructor() {
    this.configPath = path.join(__dirname, '../../.secureconfig');
    this.loadConfig();
  }

  private encrypt(text: string): string {
    if (crypto.createCipheriv) {
      const iv = crypto.randomBytes!(IV_LENGTH);
      const cipher = crypto.createCipheriv!('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } else {
      const iv = CryptoJS.lib.WordArray.random(IV_LENGTH);
      const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY, { 
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return iv.toString() + ':' + encrypted.toString();
    }
  }

  private decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = textParts.shift()!;
    const encryptedText = textParts.join(':');

    if (crypto.createDecipheriv) {
      const decipher = crypto.createDecipheriv!(
        'aes-256-cbc', 
        Buffer.from(ENCRYPTION_KEY), 
        Buffer.from(iv, 'hex')
      );
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    }
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        this.encryptedData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading secure config:', error);
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.encryptedData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving secure config:', error);
    }
  }

  public set(key: string, value: string): void {
    this.encryptedData[key] = this.encrypt(value);
    this.saveConfig();
  }

  public get(key: string): string | null {
    if (this.encryptedData[key]) {
      try {
        return this.decrypt(this.encryptedData[key]);
      } catch (error) {
        console.error(`Error decrypting value for key ${key}:`, error);
        return null;
      }
    }
    return null;
  }

  public getAll(): Record<string, string> {
    const decryptedData: Record<string, string> = {};
    for (const key in this.encryptedData) {
      const value = this.get(key);
      if (value) {
        decryptedData[key] = value;
      }
    }
    return decryptedData;
  }
}

// Export a singleton instance
export const secureConfig: SecureConfig = new SecureConfigImpl();