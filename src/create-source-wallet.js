import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

/**
 * Creates a new Solana wallet to use as the source for funding all accounts
 */
function createSourceWallet() {
  try {
    // Generate a new keypair
    const sourceKeypair = Keypair.generate();
    
    // Convert to array format for Solana CLI compatibility
    const secretKeyArray = Array.from(sourceKeypair.secretKey);
    
    // Save to file
    fs.writeFileSync("source-wallet.json", JSON.stringify(secretKeyArray));
    
    console.log(`Source wallet created successfully!`);
    console.log(`Public Key: ${sourceKeypair.publicKey.toString()}`);
    console.log(`Secret Key saved to source-wallet.json`);
    
    console.log(`\nTo fund this wallet, run:`);
    console.log(`solana airdrop 2 ${sourceKeypair.publicKey.toString()} --url https://api.devnet.solana.com`);
    
    console.log(`\nThen to distribute SOL to all accounts, run:`);
    console.log(`npm run distribute-sol -- ./source-wallet.json 0.05`);
    
  } catch (error) {
    console.error("Error creating source wallet:", error);
  }
}

// Run the function
createSourceWallet(); 