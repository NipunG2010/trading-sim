// test-accounts-format.js
import fs from 'fs';
import { PublicKey, Keypair } from '@solana/web3.js';

console.log('🧪 Testing account format...');

// Check if accounts.json exists
if (!fs.existsSync('accounts.json')) {
  console.error('❌ accounts.json not found. Please create accounts first.');
  process.exit(1);
}

try {
  // Read accounts.json
  const accountsData = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
  
  console.log(`ℹ️ Found ${accountsData.length} accounts`);
  
  // Validate each account
  let validAccounts = 0;
  let invalidAccounts = 0;
  let fixedAccounts = 0;
  
  const updatedAccounts = accountsData.map((account, index) => {
    try {
      // Validate public key
      new PublicKey(account.publicKey);
      
      // Validate secret key
      let secretKeyValid = false;
      let fixedSecretKey = null;
      
      // Try different formats
      try {
        if (typeof account.secretKey === 'string') {
          // Try base64 decode
          const decoded = Buffer.from(account.secretKey, 'base64');
          if (decoded.length === 64) {
            Keypair.fromSecretKey(decoded);
            secretKeyValid = true;
          }
        } else if (Array.isArray(account.secretKey)) {
          // Try array format
          const uint8Array = Uint8Array.from(account.secretKey);
          if (uint8Array.length === 64) {
            Keypair.fromSecretKey(uint8Array);
            secretKeyValid = true;
            
            // Convert to base64 string for consistency
            fixedSecretKey = Buffer.from(uint8Array).toString('base64');
            fixedAccounts++;
          }
        }
      } catch (formatError) {
        console.error(`❌ Account ${index} has invalid secret key format: ${formatError.message}`);
      }
      
      if (secretKeyValid) {
        validAccounts++;
        return {
          ...account,
          secretKey: fixedSecretKey || account.secretKey,
          type: account.type || (index < Math.floor(accountsData.length * 0.4) ? 'whale' : 'retail')
        };
      } else {
        invalidAccounts++;
        console.error(`❌ Account ${index} (${account.publicKey}) has invalid secret key`);
        
        // Return original account
        return account;
      }
    } catch (error) {
      invalidAccounts++;
      console.error(`❌ Invalid account ${index}: ${error.message}`);
      return account;
    }
  });
  
  console.log(`✅ Valid accounts: ${validAccounts}/${accountsData.length}`);
  if (invalidAccounts > 0) {
    console.log(`❌ Invalid accounts: ${invalidAccounts}/${accountsData.length}`);
  }
  
  // Update accounts.json if fixes were applied
  if (fixedAccounts > 0) {
    console.log(`🔧 Fixed ${fixedAccounts} accounts. Updating accounts.json...`);
    fs.writeFileSync('accounts.json', JSON.stringify(updatedAccounts, null, 2));
    console.log('✅ accounts.json updated successfully');
  }
  
  console.log('✅ Account format test completed');
} catch (error) {
  console.error('❌ Error during testing:', error);
  process.exit(1);
} 