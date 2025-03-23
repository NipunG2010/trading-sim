const { Connection, PublicKey } = require("@solana/web3.js");
const { validateAccount } = require("./accounts");
const fs = require("fs");

/**
 * Tests all accounts in accounts.json
 */
async function testAccounts() {
  console.log("\n🔍 Testing Solana accounts...");
  
  try {
    // Check if accounts file exists
    if (!fs.existsSync("accounts.json")) {
      throw new Error("accounts.json not found. Please run 'npm run create-accounts' first.");
    }
    
    // Read and parse accounts file
    const accounts = JSON.parse(fs.readFileSync("accounts.json", "utf-8"));
    console.log(`📝 Found ${accounts.length} accounts to test\n`);
    
    // Connect to Solana devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    let validCount = 0;
    let whaleCount = 0;
    let retailCount = 0;
    
    // Test each account
    for (const account of accounts) {
      try {
        // Validate account format and keys
        validateAccount(account);
        
        // Verify public key is valid
        new PublicKey(account.publicKey);
        
        // Count account types
        if (account.type === 'whale') whaleCount++;
        else if (account.type === 'retail') retailCount++;
        
        validCount++;
        console.log(`✅ Account ${account.index} (${account.type}): ${account.publicKey} - Valid`);
      } catch (error) {
        console.error(`❌ Account ${account.index}: ${account.publicKey} - Invalid: ${error.message}`);
      }
    }
    
    // Print summary
    console.log("\n📊 Test Summary:");
    console.log(`Total Accounts: ${accounts.length}`);
    console.log(`Valid Accounts: ${validCount}`);
    console.log(`Invalid Accounts: ${accounts.length - validCount}`);
    console.log(`Whale Accounts: ${whaleCount}`);
    console.log(`Retail Accounts: ${retailCount}`);
    
    if (validCount === accounts.length) {
      console.log("\n✅ All accounts are valid!");
      console.log("\n📝 Next steps:");
      console.log("1. Create a source wallet:    npm run create-source-wallet");
      console.log("2. Fund the source wallet:    solana airdrop 2 <SOURCE_WALLET_PUBLIC_KEY> --url https://api.devnet.solana.com");
      console.log("3. Distribute SOL:            npm run distribute-sol -- ./source-wallet.json 0.05");
    } else {
      console.error("\n❌ Some accounts are invalid. Please recreate the accounts.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error testing accounts:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testAccounts().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { testAccounts }; 