const { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} = require("@solana/web3.js");
const fs = require("fs");

// Constants
const BATCH_SIZE = 5; // Process 5 accounts at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches

/**
 * Calculate distribution ranges based on available balance
 * @param {number} totalBalanceSOL - Total balance in SOL
 * @param {number} whaleCount - Number of whale accounts
 * @param {number} retailCount - Number of retail accounts
 * @returns {Object} Distribution ranges for whale and retail accounts
 */
function calculateDistributionRanges(totalBalanceSOL, whaleCount, retailCount) {
  // Reserve 10% of balance for transaction fees and safety margin
  const usableBalanceSOL = totalBalanceSOL * 0.9;
  
  // Allocate 70% to whales, 30% to retail
  const whalePoolSOL = usableBalanceSOL * 0.7;
  const retailPoolSOL = usableBalanceSOL * 0.3;
  
  // Calculate average amounts
  const avgWhaleSOL = whalePoolSOL / whaleCount;
  const avgRetailSOL = retailPoolSOL / retailCount;
  
  // Set ranges with ±20% variance for whales and ±30% variance for retail
  return {
    WHALE: {
      MIN: avgWhaleSOL * 0.8,
      MAX: avgWhaleSOL * 1.2,
      POOL: whalePoolSOL
    },
    RETAIL: {
      MIN: avgRetailSOL * 0.7,
      MAX: avgRetailSOL * 1.3,
      POOL: retailPoolSOL
    }
  };
}

/**
 * Generates a random amount of SOL within the specified range
 * @param {string} accountType - Type of account ('whale' or 'retail')
 * @param {Object} ranges - Distribution ranges
 * @param {Object} state - Current distribution state
 * @returns {number} Random amount of SOL
 */
function getRandomAmount(accountType, ranges, state) {
  const type = accountType.toLowerCase();
  const range = ranges[accountType.toUpperCase()];
  const remaining = range.POOL - state[type];
  const count = state[`${type}Count`];
  
  if (count <= 1) {
    // Last account of this type - give remaining balance
    return remaining;
  }
  
  // Calculate safe maximum to ensure we don't exceed pool
  const safeMax = Math.min(range.MAX, remaining - (range.MIN * (count - 1)));
  const safeMin = Math.max(range.MIN, remaining - (range.MAX * (count - 1)));
  
  return safeMin + (Math.random() * (safeMax - safeMin));
}

/**
 * Distributes SOL from a source wallet to all generated accounts with random amounts
 * @param {string} sourceKeypairPath - Path to the JSON file containing the source wallet keypair
 */
async function distributeSol(sourceKeypairPath) {
  try {
    console.log("\n💰 Starting proportional SOL distribution...");
    
    // Connect to Solana devnet
    const connection = new Connection("https://api.devnet.solana.com", {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000
    });
    
    // Validate source wallet
    if (!fs.existsSync(sourceKeypairPath)) {
      throw new Error(`Source keypair file not found at ${sourceKeypairPath}`);
    }
    
    // Load and validate source keypair
    let sourceKeypair;
    try {
      const sourceKeypairData = JSON.parse(fs.readFileSync(sourceKeypairPath, "utf-8"));
      sourceKeypair = Keypair.fromSecretKey(Uint8Array.from(sourceKeypairData));
    } catch (error) {
      throw new Error(`Invalid source keypair file: ${error.message}`);
    }
    
    // Check source wallet balance
    const sourceBalance = await connection.getBalance(sourceKeypair.publicKey);
    const sourceBalanceSOL = sourceBalance / LAMPORTS_PER_SOL;
    console.log(`\n📊 Source Wallet Info:`);
    console.log(`Address: ${sourceKeypair.publicKey.toString()}`);
    console.log(`Balance: ${sourceBalanceSOL} SOL`);
    
    // Load target accounts
    if (!fs.existsSync("accounts.json")) {
      throw new Error("accounts.json not found. Please create accounts first.");
    }
    
    const accountData = JSON.parse(fs.readFileSync("accounts.json", "utf-8"));
    const whaleCount = accountData.filter(a => a.type === 'whale').length;
    const retailCount = accountData.filter(a => a.type === 'retail').length;
    const totalAccounts = accountData.length;
    
    // Calculate distribution ranges based on available balance
    const ranges = calculateDistributionRanges(sourceBalanceSOL, whaleCount, retailCount);
    
    // Distribution state tracking
    const state = {
      whale: 0,
      retail: 0,
      whaleCount,
      retailCount
    };
    
    console.log(`\n📝 Distribution Plan:`);
    console.log(`Total Accounts: ${totalAccounts} (${whaleCount} whales, ${retailCount} retail)`);
    console.log(`Whale Pool: ${ranges.WHALE.POOL.toFixed(4)} SOL (${ranges.WHALE.MIN.toFixed(4)}-${ranges.WHALE.MAX.toFixed(4)} per account)`);
    console.log(`Retail Pool: ${ranges.RETAIL.POOL.toFixed(4)} SOL (${ranges.RETAIL.MIN.toFixed(4)}-${ranges.RETAIL.MAX.toFixed(4)} per account)`);
    console.log(`Processing in batches of ${BATCH_SIZE}`);
    
    // Process accounts in batches
    let successCount = 0;
    let failureCount = 0;
    let totalDistributed = 0;
    
    // Sort accounts to process whales first
    accountData.sort((a, b) => (a.type === 'whale' ? -1 : 1));
    
    for (let i = 0; i < accountData.length; i += BATCH_SIZE) {
      const batch = accountData.slice(i, Math.min(i + BATCH_SIZE, accountData.length));
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(accountData.length / BATCH_SIZE);
      
      console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches}...`);
      
      const batchPromises = batch.map(async (account) => {
        try {
          // Generate random amount based on account type and remaining pool
          const solAmount = getRandomAmount(account.type, ranges, state);
          const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
          
          // Update state before transaction
          state[account.type.toLowerCase()] += solAmount;
          state[`${account.type.toLowerCase()}Count`]--;
          
          // Create and send transaction
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: sourceKeypair.publicKey,
              toPubkey: new PublicKey(account.publicKey),
              lamports
            })
          );
          
          const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [sourceKeypair],
            {
              commitment: "confirmed",
              preflightCommitment: "confirmed"
            }
          );
          
          console.log(`✅ Sent ${solAmount.toFixed(4)} SOL to ${account.publicKey} (${account.type})`);
          console.log(`   Pool remaining: ${(ranges[account.type.toUpperCase()].POOL - state[account.type.toLowerCase()]).toFixed(4)} SOL`);
          console.log(`   Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
          successCount++;
          totalDistributed += solAmount;
          return true;
        } catch (error) {
          console.error(`❌ Failed to send to ${account.publicKey}: ${error.message}`);
          failureCount++;
          return false;
        }
      });
      
      await Promise.all(batchPromises);
      
      if (i + BATCH_SIZE < accountData.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Print final summary
    console.log("\n📊 Distribution Summary:");
    console.log(`Total Accounts Processed: ${totalAccounts}`);
    console.log(`Successful Transfers: ${successCount}`);
    console.log(`Failed Transfers: ${failureCount}`);
    console.log(`Total SOL Distributed: ${totalDistributed.toFixed(4)}`);
    console.log(`Whale Pool Used: ${state.whale.toFixed(4)} SOL`);
    console.log(`Retail Pool Used: ${state.retail.toFixed(4)} SOL`);
    console.log(`Average per Account: ${(totalDistributed / successCount).toFixed(4)}`);
    
    if (successCount === totalAccounts) {
      console.log("\n✅ SOL distribution completed successfully!");
      console.log("\n📝 Next step:");
      console.log("Create and distribute token: npm run create-token");
    } else {
      console.error("\n⚠️ Some transfers failed. Please check the logs above.");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n❌ Error distributing SOL:", error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const sourceKeypairPath = process.argv[2];

if (!sourceKeypairPath) {
  console.log(`
Usage: node src/distribute-sol.js <source-keypair-path>

Parameters:
  source-keypair-path   Path to the JSON file containing the source wallet keypair

Distribution Strategy:
  - Uses 90% of available balance (10% reserved for fees)
  - Whale accounts get 70% of usable balance
  - Retail accounts get 30% of usable balance
  - Amounts vary within ±20% for whales, ±30% for retail
  - Processes whale accounts first
  - Ensures fair distribution within pools

Example:
  node src/distribute-sol.js ./source-wallet.json
`);
} else {
  distributeSol(sourceKeypairPath).catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { distributeSol }; 