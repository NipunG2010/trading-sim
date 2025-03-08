import { Keypair } from "@solana/web3.js";
import fs from "fs";

/**
 * Generates 50 Solana keypairs with staggered timing (1-5s delays)
 * to simulate organic wallet creation.
 */
async function createAccounts() {
  const accounts = [];
  for (let i = 0; i < 50; i++) {
    // Random delay between 1-5 seconds
    await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 1000));
    const keypair = Keypair.generate();
    accounts.push(keypair);
    console.log(`Created account ${i + 1}: ${keypair.publicKey.toString()}`);
  }
  return accounts;
}

/**
 * Saves generated accounts to a JSON file for later use.
 * Secret keys are base64-encoded for security.
 */
async function saveAccounts() {
  try {
    const accounts = await createAccounts();
    const accountData = accounts.map((account, index) => ({
      index: index + 1,
      publicKey: account.publicKey.toString(),
      secretKey: Buffer.from(account.secretKey).toString("base64")
    }));
    
    // Write to accounts.json in the current directory
    fs.writeFileSync("accounts.json", JSON.stringify(accountData, null, 2));
    console.log("50 accounts saved to accounts.json");
  } catch (error) {
    console.error("Error creating or saving accounts:", error);
  }
}

// Run the account creation
saveAccounts(); 