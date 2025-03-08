import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import * as fs from "fs";

/**
 * Distributes SOL from a source wallet to all generated accounts
 * @param {string} sourceKeypairPath - Path to the JSON file containing the source wallet keypair
 * @param {number} amountPerAccount - Amount of SOL to send to each account (default: 0.05)
 */
async function distributeSol(sourceKeypairPath, amountPerAccount = 0.05) {
  try {
    // Connect to Solana devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Load source wallet
    if (!fs.existsSync(sourceKeypairPath)) {
      throw new Error(`Source keypair file not found at ${sourceKeypairPath}`);
    }
    
    // Load source keypair - expects a JSON array of numbers
    const sourceKeypairData = JSON.parse(fs.readFileSync(sourceKeypairPath, "utf-8"));
    const sourceKeypair = Keypair.fromSecretKey(
      Uint8Array.from(sourceKeypairData)
    );
    
    // Check source wallet balance
    const sourceBalance = await connection.getBalance(sourceKeypair.publicKey);
    console.log(`Source wallet: ${sourceKeypair.publicKey.toString()}`);
    console.log(`Source balance: ${sourceBalance / 1000000000} SOL`);
    
    // Load target accounts
    const accountData = JSON.parse(fs.readFileSync("accounts.json", "utf-8"));
    const totalAccounts = accountData.length;
    
    // Calculate total SOL needed
    const amountInLamports = amountPerAccount * 1000000000; // Convert SOL to lamports
    const totalNeeded = amountInLamports * totalAccounts;
    
    if (sourceBalance < totalNeeded) {
      console.log(`\n⚠️ Warning: Source wallet doesn't have enough SOL.`);
      console.log(`Required: ${totalNeeded / 1000000000} SOL for ${totalAccounts} accounts`);
      console.log(`Available: ${sourceBalance / 1000000000} SOL`);
      console.log(`\nPlease fund your source wallet with at least ${totalNeeded / 1000000000} SOL.`);
      console.log(`You can use: solana airdrop 2 ${sourceKeypair.publicKey.toString()} --url https://api.devnet.solana.com`);
      return;
    }
    
    console.log(`\nDistributing ${amountPerAccount} SOL to each of ${totalAccounts} accounts...`);
    
    // Track successful and failed transfers
    let successCount = 0;
    let failCount = 0;
    
    // Process accounts in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < accountData.length; i += batchSize) {
      const batch = accountData.slice(i, i + batchSize);
      
      // Process each account in the batch
      const batchPromises = batch.map(async (account) => {
        try {
          const destinationPubkey = new PublicKey(account.publicKey);
          
          // Check if account already has SOL
          const destBalance = await connection.getBalance(destinationPubkey);
          if (destBalance >= amountInLamports) {
            console.log(`Account ${account.index} already has ${destBalance / 1000000000} SOL, skipping.`);
            successCount++;
            return;
          }
          
          // Create and send transaction
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: sourceKeypair.publicKey,
              toPubkey: destinationPubkey,
              lamports: amountInLamports
            })
          );
          
          const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [sourceKeypair]
          );
          
          console.log(`Transferred ${amountPerAccount} SOL to account ${account.index}: ${account.publicKey}`);
          console.log(`Transaction signature: ${signature}`);
          successCount++;
        } catch (error) {
          console.error(`Failed to transfer to account ${account.index}: ${account.publicKey}`);
          console.error(error);
          failCount++;
        }
      });
      
      // Wait for all transfers in this batch to complete
      await Promise.all(batchPromises);
      
      // Add a delay between batches to avoid rate limiting
      if (i + batchSize < accountData.length) {
        console.log(`Waiting 2 seconds before processing next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\nDistribution complete!`);
    console.log(`Successfully funded: ${successCount} accounts`);
    if (failCount > 0) {
      console.log(`Failed to fund: ${failCount} accounts`);
    }
    
    // Check final source balance
    const finalSourceBalance = await connection.getBalance(sourceKeypair.publicKey);
    console.log(`Remaining source balance: ${finalSourceBalance / 1000000000} SOL`);
    
  } catch (error) {
    console.error("Error distributing SOL:", error);
  }
}

// Check if source keypair path is provided as command line argument
const sourceKeypairPath = process.argv[2];
const amountPerAccount = process.argv[3] ? parseFloat(process.argv[3]) : 0.05;

if (!sourceKeypairPath) {
  console.log(`
Usage: node src/distribute-sol.js <source-keypair-path> [amount-per-account]

Parameters:
  source-keypair-path   Path to the JSON file containing the source wallet keypair
  amount-per-account    Amount of SOL to send to each account (default: 0.05)

Example:
  node src/distribute-sol.js ./my-wallet.json 0.1
  
Note: The source keypair file should be a JSON array of numbers representing the secret key.
You can export your keypair from Solana CLI using:
  solana-keygen export-keypair --outfile my-wallet.json <KEYPAIR_PATH>
`);
} else {
  distributeSol(sourceKeypairPath, amountPerAccount);
} 