import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";

async function checkBalance() {
  try {
    // Connect to Solana devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Load accounts from file
    const accountData = JSON.parse(fs.readFileSync("accounts.json", "utf-8"));
    
    // Check balance of the first account (payer)
    const payerPublicKey = new PublicKey(accountData[0].publicKey);
    const balance = await connection.getBalance(payerPublicKey);
    
    console.log(`Account: ${payerPublicKey.toString()}`);
    console.log(`Balance: ${balance / 1000000000} SOL`);
    
    if (balance === 0) {
      console.log("\n⚠️ This account has no SOL. You need to fund it before creating a token.");
      console.log("\nTo fund this account, run the following command in your terminal:");
      console.log(`\nsolana airdrop 1 ${payerPublicKey.toString()} --url https://api.devnet.solana.com`);
      console.log("\nOr use the Solana CLI to transfer SOL to this account.");
    } else {
      console.log("\n✅ This account has sufficient SOL to create a token.");
    }
    
    // Also check a few other accounts
    console.log("\nChecking a few other accounts:");
    for (let i = 1; i < Math.min(5, accountData.length); i++) {
      const pubkey = new PublicKey(accountData[i].publicKey);
      const bal = await connection.getBalance(pubkey);
      console.log(`Account ${i}: ${pubkey.toString()} - ${bal / 1000000000} SOL`);
    }
    
  } catch (error) {
    console.error("Error checking balance:", error);
  }
}

// Run the balance check
checkBalance(); 