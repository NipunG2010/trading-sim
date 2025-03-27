import fs from 'fs';
import path from 'path';
import secureConfig from '../src/config/secureConfig';

async function migrateAccounts() {
  const accountsPath = path.join(__dirname, '../accounts.json');
  if (!fs.existsSync(accountsPath)) {
    console.log('No accounts.json file found to migrate');
    return;
  }

  try {
    const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
    
    // Store each account securely
    accountsData.forEach((account: any, index: number) => {
      secureConfig.set(`account_${index}_privateKey`, account.privateKey);
      secureConfig.set(`account_${index}_publicKey`, account.publicKey);
    });

    // Create sanitized version without private keys
    const sanitizedAccounts = accountsData.map((account: any) => ({
      publicKey: account.publicKey,
      index: account.index
    }));

    fs.writeFileSync(accountsPath, JSON.stringify(sanitizedAccounts, null, 2));
    console.log(`Migrated ${accountsData.length} accounts to secure storage`);
  } catch (error) {
    console.error('Error migrating accounts:', error);
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
    
    // Store wallet securely
    secureConfig.set('source_wallet_privateKey', walletData.privateKey);
    secureConfig.set('source_wallet_publicKey', walletData.publicKey);

    // Create sanitized version without private key
    const sanitizedWallet = {
      publicKey: walletData.publicKey
    };

    fs.writeFileSync(walletPath, JSON.stringify(sanitizedWallet, null, 2));
    console.log('Migrated source wallet to secure storage');
  } catch (error) {
    console.error('Error migrating source wallet:', error);
  }
}

async function main() {
  console.log('Starting sensitive data migration...');
  await migrateAccounts();
  await migrateSourceWallet();
  console.log('Migration complete');
}

main().catch(console.error);