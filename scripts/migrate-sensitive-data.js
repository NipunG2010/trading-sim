const fs = require('fs');
const path = require('path');
const secureConfig = require('../src/config/secureConfig');

async function migrateAccounts() {
  const accountsPath = path.join(__dirname, '../accounts.json');
  if (!fs.existsSync(accountsPath)) {
    console.log('No accounts.json file found to migrate');
    return;
  }

  try {
    const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
    
    // Validate and store each account securely
    accountsData.forEach((account, index) => {
      if (!account.privateKey || !account.publicKey) {
        console.warn(`Skipping account ${index} - missing required fields`);
        return;
      }
      
      secureConfig.set(`account_${index}_privateKey`, account.privateKey);
      secureConfig.set(`account_${index}_publicKey`, account.publicKey);
    });

    // Create sanitized version 
    const sanitizedAccounts = accountsData.map(account => ({
      publicKey: account.publicKey,
      index: account.index
    }));

    fs.writeFileSync(accountsPath, JSON.stringify(sanitizedAccounts, null, 2));
    console.log(`Migrated ${accountsData.length} accounts to secure storage - removed private keys`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error; // Re-throw to fail the process
  }
}

async function migrateSourceWallet() {
  const walletPath = path.join(__dirname, '../source-wallet.json');
  if (!fs.existsSync(walletPath)) {
    console.log('No source-wallet.json file found to migrate');
    return;
  }

  try {
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    if (!walletData.privateKey || !walletData.publicKey) {
      throw new Error('Source wallet missing required fields');
    }

    secureConfig.set('source_wallet_privateKey', walletData.privateKey);
    secureConfig.set('source_wallet_publicKey', walletData.publicKey);

    // Create sanitized version
    fs.writeFileSync(walletPath, JSON.stringify({
      publicKey: walletData.publicKey
    }, null, 2));
    
    console.log('Successfully migrated source wallet to secure storage');
  } catch (error) {
    console.error('Wallet migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting sensitive data migration...');
    await migrateAccounts();
    await migrateSourceWallet();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed completely:', error);
    process.exit(1);
  }
}

main();