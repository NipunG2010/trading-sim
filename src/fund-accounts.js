// src/fund-accounts.js
import * as fs from "fs";

/**
 * Prints public keys for manual devnet funding.
 */
function printPublicKeys() {
  try {
    const accountData = JSON.parse(fs.readFileSync("accounts.json", "utf-8"));
    accountData.forEach((account) => {
      console.log(`solana airdrop 0.1 ${account.publicKey} --url https://api.devnet.solana.com`);
    });
    console.log(`\nTotal accounts to fund: ${accountData.length}`);
    console.log("Run these commands to fund your accounts with SOL on devnet");
  } catch (error) {
    console.error("Error reading accounts file:", error);
  }
}

// Run the function
printPublicKeys(); 