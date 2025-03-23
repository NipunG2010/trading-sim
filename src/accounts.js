const { Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// Constants
const TOTAL_ACCOUNTS = 50;
const WHALE_PERCENTAGE = 0.4; // 40% whales
const ACCOUNTS_FILE = "accounts.json";
const ACCOUNT_TYPES = {
  WHALE: 'whale',
  RETAIL: 'retail'
};

/**
 * Creates a new account with proper error handling
 * @returns {Object} Account object with public key and encrypted secret key
 */
function createAccount(index) {
  try {
    const keypair = Keypair.generate();
    const isWhale = index < Math.floor(TOTAL_ACCOUNTS * WHALE_PERCENTAGE);
    
    return {
      index: index + 1,
      publicKey: keypair.publicKey.toString(),
      secretKey: Buffer.from(keypair.secretKey).toString('base64'),
      type: isWhale ? ACCOUNT_TYPES.WHALE : ACCOUNT_TYPES.RETAIL,
      created: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to create account ${index + 1}: ${error.message}`);
  }
}

/**
 * Validates an account object
 * @param {Object} account Account object to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateAccount(account) {
  if (!account.publicKey || !account.secretKey) {
    throw new Error(`Invalid account format: missing required fields`);
  }
  
  try {
    // Verify we can reconstruct the keypair
    const secretKey = Buffer.from(account.secretKey, 'base64');
    const keypair = Keypair.fromSecretKey(secretKey);
    
    // Verify public key matches
    if (keypair.publicKey.toString() !== account.publicKey) {
      throw new Error('Public key mismatch');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Account validation failed: ${error.message}`);
  }
}

/**
 * Creates all accounts and saves them securely
 */
async function createAccounts() {
  console.log(`\n🔐 Creating ${TOTAL_ACCOUNTS} Solana accounts...`);
  console.log(`📊 Distribution: ${Math.floor(TOTAL_ACCOUNTS * WHALE_PERCENTAGE)} whale accounts, ${Math.ceil(TOTAL_ACCOUNTS * (1 - WHALE_PERCENTAGE))} retail accounts\n`);
  
  const accounts = [];
  let successCount = 0;
  
  for (let i = 0; i < TOTAL_ACCOUNTS; i++) {
    try {
      // Add random delay between 100ms and 1s for more organic creation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 900 + 100));
      
      const account = createAccount(i);
      validateAccount(account);
      
      accounts.push(account);
      successCount++;
      
      console.log(`✅ Created account ${account.index}/${TOTAL_ACCOUNTS}: ${account.publicKey} (${account.type})`);
    } catch (error) {
      console.error(`❌ Failed to create account ${i + 1}: ${error.message}`);
    }
  }
  
  if (successCount === TOTAL_ACCOUNTS) {
    try {
      // Save accounts to file
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
      console.log(`\n💾 Successfully saved ${successCount} accounts to ${ACCOUNTS_FILE}`);
      
      // Print next steps
      console.log("\n📝 Next steps:");
      console.log("1. Create a source wallet:    npm run create-source-wallet");
      console.log("2. Fund the source wallet:    solana airdrop 2 <SOURCE_WALLET_PUBLIC_KEY> --url https://api.devnet.solana.com");
      console.log("3. Distribute SOL:            npm run distribute-sol -- ./source-wallet.json 0.05");
      console.log("4. Create and distribute token: npm run create-token");
    } catch (error) {
      console.error(`\n❌ Failed to save accounts: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error(`\n❌ Failed to create all accounts. Only ${successCount}/${TOTAL_ACCOUNTS} were successful.`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createAccounts().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = {
  createAccount,
  validateAccount,
  createAccounts,
  ACCOUNT_TYPES
}; 