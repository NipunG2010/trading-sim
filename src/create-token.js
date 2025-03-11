// src/create-token.js
import { Connection } from "@solana/web3.js";
import { setupToken } from "./token-creation.js";
import * as fs from "fs";

// Connect to Solana devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Check if required files exist
if (!fs.existsSync('accounts.json')) {
  console.error("Error: accounts.json file not found. Please run 'npm run create-accounts-js' first.");
  process.exit(1);
}

if (!fs.existsSync('source-wallet.json')) {
  console.error("Error: source-wallet.json file not found. Please run 'npm run create-source-wallet' first.");
  process.exit(1);
}

// Run the token setup with timeout and retry logic
console.log("Starting token creation and distribution process...");

// Set a timeout for the entire process (5 minutes)
const timeout = setTimeout(() => {
  console.error("Token creation timed out after 5 minutes. Please try again.");
  process.exit(1);
}, 5 * 60 * 1000);

// Run with retry logic
let attempts = 0;
const maxAttempts = 3;

async function runWithRetry() {
  attempts++;
  try {
    console.log(`Attempt ${attempts}/${maxAttempts} to create and distribute token...`);
    const result = await setupToken(connection);
    console.log("Token creation and distribution completed successfully!");
    console.log(`Token mint: ${result.mint}`);
    console.log(`Token name: ${result.name}`);
    console.log(`Token symbol: ${result.symbol}`);
    console.log(`Token decimals: ${result.decimals}`);
    console.log(`Successful transfers: ${result.transfers}`);
    console.log(`Total tokens distributed: ${result.totalDistributed.toLocaleString()}`);
    
    // Clear the timeout since we succeeded
    clearTimeout(timeout);
    process.exit(0);
  } catch (error) {
    console.error(`Error in token setup (attempt ${attempts}/${maxAttempts}):`, error);
    
    if (attempts < maxAttempts) {
      console.log(`Retrying in 3 seconds...`);
      setTimeout(runWithRetry, 3000);
    } else {
      console.error("Maximum retry attempts reached. Token creation failed.");
      clearTimeout(timeout);
      process.exit(1);
    }
  }
}

// Start the process
runWithRetry(); 