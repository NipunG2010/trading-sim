// test-token-distribution.js
import fs from 'fs';
import { PublicKey } from '@solana/web3.js';

console.log('🧪 Testing token distribution...');

// Initialize arrays for holding data
let accounts = [];
let tokenInfo = null;
let transactions = [];

// Check if accounts.json exists
if (!fs.existsSync('accounts.json')) {
  console.error('❌ accounts.json not found. Please create accounts first.');
  process.exit(1);
}

// Check if token-info.json exists
if (!fs.existsSync('public/token-info.json')) {
  console.error('❌ token-info.json not found. Please create token first.');
  process.exit(1);
}

// Load data
try {
  // Read accounts.json
  accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
  console.log(`📊 Loaded ${accounts.length} accounts`);
  
  // Read token-info.json
  tokenInfo = JSON.parse(fs.readFileSync('public/token-info.json', 'utf-8'));
  console.log(`🪙 Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
  console.log(`💰 Total Supply: ${tokenInfo.totalSupply.toLocaleString()}`);
  
  // Read transactions.json if it exists
  if (fs.existsSync('transactions.json')) {
    transactions = JSON.parse(fs.readFileSync('transactions.json', 'utf-8'));
    console.log(`📝 Loaded ${transactions.length} transactions`);
  } else {
    console.log('⚠️ No transactions.json found. Distribution will be simulated.');
  }
} catch (error) {
  console.error('❌ Error loading data:', error);
  process.exit(1);
}

// Create a map to hold account balances
const balances = {};

// Initialize balances
accounts.forEach(account => {
  balances[account.publicKey] = 0;
  
  // Mark account as whale or retail based on index (first 40% are whales)
  const isWhale = accounts.indexOf(account) < Math.floor(accounts.length * 0.4);
  account.type = account.type || (isWhale ? 'whale' : 'retail');
});

// Process transactions to calculate balances
if (transactions.length > 0) {
  transactions.forEach(tx => {
    if (tx.from && tx.to && tx.amount) {
      // Subtract from sender
      if (balances[tx.from] !== undefined) {
        balances[tx.from] -= tx.amount;
      }
      
      // Add to receiver
      if (balances[tx.to] !== undefined) {
        balances[tx.to] += tx.amount;
      }
    }
  });
} else {
  // Simulate distribution based on account type
  accounts.forEach(account => {
    // Calculate a simulated balance
    if (account.type === 'whale') {
      // Whales get 2-5% of supply
      const percentage = 2 + (Math.random() * 3);
      balances[account.publicKey] = Math.floor(tokenInfo.totalSupply * (percentage / 100));
    } else {
      // Retail accounts get 0.5-2% of supply
      const percentage = 0.5 + (Math.random() * 1.5);
      balances[account.publicKey] = Math.floor(tokenInfo.totalSupply * (percentage / 100));
    }
  });
}

// Calculate total tokens distributed
const totalDistributed = Object.values(balances).reduce((sum, balance) => sum + balance, 0);
const distributionPercentage = (totalDistributed / tokenInfo.totalSupply) * 100;

console.log(`\n📊 Distribution Summary:`);
console.log(`💰 Total Tokens Distributed: ${totalDistributed.toLocaleString()} (${distributionPercentage.toFixed(2)}% of supply)`);

// Count by account type
const whaleAccounts = accounts.filter(a => a.type === 'whale');
const retailAccounts = accounts.filter(a => a.type === 'retail');

console.log(`🐋 Whale Accounts: ${whaleAccounts.length} (${((whaleAccounts.length / accounts.length) * 100).toFixed(1)}%)`);
console.log(`👤 Retail Accounts: ${retailAccounts.length} (${((retailAccounts.length / accounts.length) * 100).toFixed(1)}%)`);

// Calculate whale holdings
const whaleHoldings = whaleAccounts.reduce((sum, account) => sum + balances[account.publicKey], 0);
const whalePercentage = (whaleHoldings / totalDistributed) * 100;

console.log(`\n🐋 Whale Holdings: ${whaleHoldings.toLocaleString()} (${whalePercentage.toFixed(2)}% of distributed tokens)`);
console.log(`👤 Retail Holdings: ${(totalDistributed - whaleHoldings).toLocaleString()} (${(100 - whalePercentage).toFixed(2)}% of distributed tokens)`);

// Display top 5 whale accounts
console.log('\n🔝 Top 5 Whale Accounts:');
const whaleBalances = whaleAccounts.map(account => ({
  publicKey: account.publicKey,
  balance: balances[account.publicKey],
  percentage: (balances[account.publicKey] / tokenInfo.totalSupply) * 100
}));

whaleBalances.sort((a, b) => b.balance - a.balance);

whaleBalances.slice(0, 5).forEach((account, index) => {
  console.log(`${index + 1}. ${account.publicKey}: ${account.balance.toLocaleString()} tokens (${account.percentage.toFixed(2)}%)`);
});

console.log('\n✅ Token distribution test completed successfully');

// Save distribution to balance-info.json for the UI to display
try {
  const balanceInfo = accounts.map(account => ({
    publicKey: account.publicKey,
    type: account.type,
    balance: balances[account.publicKey]
  }));
  
  fs.writeFileSync('public/balance-info.json', JSON.stringify({
    timestamp: Date.now(),
    totalDistributed,
    distributionPercentage,
    whalePercentage,
    balances: balanceInfo
  }, null, 2));
  
  console.log('✅ Balance info saved to public/balance-info.json');
} catch (error) {
  console.error('❌ Error saving balance info:', error);
} 