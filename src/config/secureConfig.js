const dotenv = require('dotenv');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Use native crypto if available, otherwise fallback to crypto-js
const crypto = globalThis.crypto || require('crypto');

// Ensure key is exactly 32 bytes for AES-256
const generateEncryptionKey = () => {
  if (process.env.ENCRYPTION_KEY) {
    // Pad or truncate to 32 bytes if needed
    const key = Buffer.from(process.env.ENCRYPTION_KEY);
    return key.length >= 32 ? key.slice(0, 32) : Buffer.concat([key], 32);
  }
  return crypto.randomBytes ? crypto.randomBytes(32) : 
    Buffer.from(CryptoJS.lib.WordArray.random(32).toString(), 'hex');
};

const ENCRYPTION_KEY = generateEncryptionKey();
const IV_LENGTH = 16;

class SecureConfigImpl {
  constructor() {
    this.configPath = path.join(__dirname, '../../.secureconfig');
    this.encryptedData = {};
    this.loadConfig();
  }

  encrypt(data) {
    // Convert arrays/objects to strings
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (crypto.createCipheriv) {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } else {
      const iv = CryptoJS.lib.WordArray.random(IV_LENGTH);
      const key = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY.toString('hex'));
      const encrypted = CryptoJS.AES.encrypt(text, key, { 
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return iv.toString() + ':' + encrypted.toString();
    }
  }

  decrypt(text) {
    const textParts = text.split(':');
    const iv = textParts.shift();
    const encryptedText = textParts.join(':');

    if (crypto.createDecipheriv) {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc', 
        ENCRYPTION_KEY, 
        Buffer.from(iv, 'hex')
      );
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse as JSON, return string if fails
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } else {
      const key = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY.toString('hex'));
      const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        this.encryptedData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading secure config:', error);
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.encryptedData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving secure config:', error);
    }
  }

  set(key, value) {
    this.encryptedData[key] = this.encrypt(value);
    this.saveConfig();
  }

  get(key) {
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

  getAll() {
    const decryptedData = {};
    for (const key in this.encryptedData) {
      decryptedData[key] = this.get(key) || '';
    }
    return decryptedData;
  }
}

// Export a singleton instance
module.exports = new SecureConfigImpl();
