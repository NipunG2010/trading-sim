const { Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const SOURCE_WALLET_FILE = "source-wallet.json";

/**
 * Creates a new Solana wallet to use as the source for funding all accounts
 * with improved error handling and validation
 */
async function createSourceWallet() {
  console.log("\n🔐 Creating source wallet for funding distribution...");
  
  try {
    // Check if source wallet already exists
    if (fs.existsSync(SOURCE_WALLET_FILE)) {
      console.log("⚠️ Source wallet already exists!");
      
      // Validate existing wallet
      try {
        const existingWallet = JSON.parse(fs.readFileSync(SOURCE_WALLET_FILE, "utf-8"));
        const keypair = Keypair.fromSecretKey(Uint8Array.from(existingWallet));
        console.log("\n✅ Existing source wallet is valid");
        console.log(`📝 Public Key: ${keypair.publicKey.toString()}`);
        return;
      } catch (error) {
        console.log("❌ Existing source wallet is invalid. Creating new one...");
      }
    }
    
    // Generate new keypair
    const sourceKeypair = Keypair.generate();
    
    // Convert to array format for Solana CLI compatibility
    const secretKeyArray = Array.from(sourceKeypair.secretKey);
    
    // Save to file
    fs.writeFileSync(SOURCE_WALLET_FILE, JSON.stringify(secretKeyArray));
    
    console.log("\n✅ Source wallet created successfully!");
    console.log(`📝 Public Key: ${sourceKeypair.publicKey.toString()}`);
    
    // Print next steps
    console.log("\n📝 Next steps:");
    console.log(`1. Fund your wallet with SOL (2 SOL recommended):`);
    console.log(`   solana airdrop 2 ${sourceKeypair.publicKey.toString()} --url https://api.devnet.solana.com`);
    console.log("\n2. Distribute SOL to all accounts:");
    console.log(`   npm run distribute-sol -- ./${SOURCE_WALLET_FILE} 0.05`);
    console.log("\n3. Create and distribute token:");
    console.log("   npm run create-token");
    
  } catch (error) {
    console.error("\n❌ Error creating source wallet:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createSourceWallet().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { createSourceWallet }; 
createSourceWallet(); 