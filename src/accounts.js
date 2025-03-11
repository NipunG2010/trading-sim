import { Keypair } from "@solana/web3.js";
import fs from "fs";

/**
 * Generates 50 Solana keypairs with staggered timing (1-5s delays)
 * to simulate organic wallet creation.
 */
async function createAccounts() {
  console.log("Starting account creation process...");
  const accounts = [];
  const totalAccounts = 50;
  
  console.log(`Creating ${totalAccounts} Solana accounts...`);
  
  for (let i = 0; i < totalAccounts; i++) {
    // Random delay between 100-500ms (faster for testing)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 100));
    
    const keypair = Keypair.generate();
    accounts.push(keypair);
    
    // Log progress
    if ((i + 1) % 5 === 0 || i === 0 || i === totalAccounts - 1) {
      console.log(`Created account ${i + 1}/${totalAccounts}: ${keypair.publicKey.toString()}`);
    }
  }
  
  console.log(`Successfully created ${accounts.length} accounts`);
  return accounts;
}

/**
 * Saves generated accounts to a JSON file for later use.
 * Secret keys are base64-encoded for security.
 * Also assigns account types (whale/retail) for realistic distribution.
 */
async function saveAccounts() {
  try {
    console.log("Generating accounts...");
    const accounts = await createAccounts();
    
    console.log("Processing account data...");
    const accountData = accounts.map((account, index) => {
      // Assign first 40% of accounts as whales, rest as retail
      const type = index < accounts.length * 0.4 ? "whale" : "retail";
      
      return {
        index: index + 1,
        publicKey: account.publicKey.toString(),
        secretKey: Buffer.from(account.secretKey).toString("base64"),
        type
      };
    });
    
    // Write to accounts.json in the current directory
    console.log("Saving accounts to accounts.json...");
    fs.writeFileSync("accounts.json", JSON.stringify(accountData, null, 2));
    console.log(`✅ ${accountData.length} accounts saved to accounts.json`);
    console.log(`   - ${accountData.filter(a => a.type === "whale").length} whale accounts`);
    console.log(`   - ${accountData.filter(a => a.type === "retail").length} retail accounts`);
  } catch (error) {
    console.error("❌ Error creating or saving accounts:", error);
    process.exit(1);
  }
}

// Run the account creation
console.log("🚀 Starting account creation process");
saveAccounts().then(() => {
  console.log("✅ Account creation completed successfully");
}).catch(error => {
  console.error("❌ Account creation failed:", error);
  process.exit(1);
}); 