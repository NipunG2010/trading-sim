// create-sample-accounts.js
import fs from 'fs';
import { Keypair } from '@solana/web3.js';

// Number of accounts to generate
const ACCOUNT_COUNT = 50;
const WHALE_PERCENTAGE = 0.4; // 40% of accounts are whales

console.log(`🚀 Creating ${ACCOUNT_COUNT} sample accounts for testing...`);

// Generate the accounts
const accounts = [];

for (let i = 0; i < ACCOUNT_COUNT; i++) {
  try {
    // Generate a new keypair
    const keypair = Keypair.generate();
    
    // Determine if this is a whale account
    const isWhale = i < Math.floor(ACCOUNT_COUNT * WHALE_PERCENTAGE);
    
    // Create account object
    accounts.push({
      publicKey: keypair.publicKey.toString(),
      secretKey: Buffer.from(keypair.secretKey).toString('base64'),
      type: isWhale ? 'whale' : 'retail'
    });
    
    console.log(`✅ Created account ${i+1}/${ACCOUNT_COUNT}: ${keypair.publicKey.toString()} (${isWhale ? 'whale' : 'retail'})`);
  } catch (error) {
    console.error(`❌ Error creating account ${i+1}:`, error);
  }
}

// Save to accounts.json
try {
  fs.writeFileSync('accounts.json', JSON.stringify(accounts, null, 2));
  console.log(`✅ Successfully created ${accounts.length} accounts and saved to accounts.json`);
} catch (error) {
  console.error('❌ Error saving accounts.json:', error);
}

// Create sample token info if it doesn't exist
if (!fs.existsSync('public/token-info.json')) {
  try {
    // Ensure public directory exists
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    
    // Generate random token name
    const prefixes = ["Solar", "Lunar", "Cosmic", "Quantum", "Nexus", "Stellar", "Nova"];
    const suffixes = ["Coin", "Token", "Cash", "Finance", "Money", "Credit", "Chain"];
    
    const tokenName = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    const tokenSymbol = tokenName.split(' ').map(word => word[0]).join('');
    
    // Create token info
    const tokenInfo = {
      mint: Keypair.generate().publicKey.toString(),
      name: tokenName,
      symbol: tokenSymbol,
      decimals: 9,
      totalSupply: 1000000000 // 1 billion
    };
    
    fs.writeFileSync('public/token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log(`✅ Created sample token info: ${tokenName} (${tokenSymbol})`);
  } catch (error) {
    console.error('❌ Error creating token info:', error);
  }
}

// Generate sample balance distribution and save to balance-info.json
try {
  const tokenInfo = fs.existsSync('public/token-info.json') 
    ? JSON.parse(fs.readFileSync('public/token-info.json', 'utf-8')) 
    : { totalSupply: 1000000000 };
  
  // Calculate balances
  const balances = accounts.map(account => {
    const isWhale = account.type === 'whale';
    const percentage = isWhale 
      ? 2 + (Math.random() * 3) // Whales get 2-5%
      : 0.5 + (Math.random() * 1.5); // Retail gets 0.5-2%
    
    return {
      publicKey: account.publicKey,
      type: account.type,
      balance: Math.floor(tokenInfo.totalSupply * (percentage / 100))
    };
  });
  
  // Calculate total tokens distributed
  const totalDistributed = balances.reduce((sum, account) => sum + account.balance, 0);
  const distributionPercentage = (totalDistributed / tokenInfo.totalSupply) * 100;
  
  // Calculate whale holdings
  const whaleHoldings = balances
    .filter(account => account.type === 'whale')
    .reduce((sum, account) => sum + account.balance, 0);
  
  const whalePercentage = (whaleHoldings / totalDistributed) * 100;
  
  // Save balance info
  fs.writeFileSync('public/balance-info.json', JSON.stringify({
    timestamp: Date.now(),
    totalDistributed,
    distributionPercentage,
    whalePercentage,
    balances
  }, null, 2));
  
  console.log(`✅ Created sample balance distribution`);
  console.log(`Total distributed: ${totalDistributed.toLocaleString()} (${distributionPercentage.toFixed(2)}% of supply)`);
  console.log(`Whale holdings: ${whaleHoldings.toLocaleString()} (${whalePercentage.toFixed(2)}% of distributed tokens)`);
} catch (error) {
  console.error('❌ Error creating balance distribution:', error);
}

console.log('✅ Sample data generation complete!');
console.log('👉 You can now run the simulator and see accounts in the Accounts tab.'); 