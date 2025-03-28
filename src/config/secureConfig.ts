import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

dotenv.config();

interface SecureConfig {
  get(key: string): any;
  set(key: string, value: any): void;
  getAll(): Record<string, any>;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

class SecureConfigImpl implements SecureConfig {
  private configPath: string;
  private encryptedData: Record<string, string>;

  constructor() {
    this.configPath = path.join(__dirname, '../../.secureconfig');
    this.encryptedData = {};
    this.loadConfig();
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift()!, 'hex');
      const encryptedText = textParts.join(':');
      
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc', 
        Buffer.from(ENCRYPTION_KEY), 
        iv
      );
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        this.encryptedData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading secure config:', error);
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.encryptedData, null, 2));
    } catch (error) {
      console.error('Error saving secure config:', error);
    }
  }

  public set(key: string, value: any): void {
    try {
      this.encryptedData[key] = this.encrypt(JSON.stringify(value));
      this.saveConfig();
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
    }
  }

  public get(key: string): any {
    if (this.encryptedData[key]) {
      try {
        return JSON.parse(this.decrypt(this.encryptedData[key]));
      } catch (error) {
        console.error(`Error decrypting value for key ${key}:`, error);
        return null;
      }
    }
    return null;
  }

  public getAll(): Record<string, any> {
    const decryptedData: Record<string, any> = {};
    for (const key in this.encryptedData) {
      decryptedData[key] = this.get(key);
    }
    return decryptedData;
  }
}

const secureConfig: SecureConfig = new SecureConfigImpl();
export = secureConfig;