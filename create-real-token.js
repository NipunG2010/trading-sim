// create-real-token.js
import { 
  Connection, 
  Keypair, 
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  transfer, 
  getMint,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as fs from "fs";

// Connect to devnet with increased commitment and timeout
const connection = new Connection(
  "https://api.devnet.solana.com", 
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000, // 60s timeout for confirmations
  }
);

// Load source wallet or create a new one
async function getSourceWallet() {
  if (fs.existsSync('source-wallet.json')) {
    console.log("✅ Loading existing source wallet...");
    const sourceWalletData = JSON.parse(fs.readFileSync('source-wallet.json', 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(sourceWalletData));
  } else {
    console.log("⚠️ Source wallet not found, creating a new one...");
    const wallet = Keypair.generate();
    
    // Save the wallet
    fs.writeFileSync('source-wallet.json', JSON.stringify(Array.from(wallet.secretKey)));
    
    console.log(`✅ New source wallet created: ${wallet.publicKey.toString()}`);
    console.log(`⚠️ IMPORTANT: Fund this wallet with SOL before proceeding!`);
    console.log(`Run: solana airdrop 2 ${wallet.publicKey.toString()} --url https://api.devnet.solana.com`);
    
    process.exit(0);
  }
}

// Check if wallet has enough SOL
async function checkBalance(wallet) {
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Source wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.05 * LAMPORTS_PER_SOL) { // 0.05 SOL minimum
      console.log(`⚠️ Wallet needs at least 0.05 SOL to create a token. Please fund your wallet.`);
      console.log(`Run: solana airdrop 2 ${wallet.publicKey.toString()} --url https://api.devnet.solana.com`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Error checking wallet balance:", error.message);
    return false;
  }
}

// Generate token metadata
function generateTokenMetadata() {
  const prefixes = ["Cosmic", "Quantum", "Stellar", "Nexus", "Lunar", "Solar", "Galaxy", "Nova", "Hyper", "Meta"];
  const suffixes = ["Coin", "Token", "Finance", "Money", "Cash", "Pay", "Swap", "Network", "Chain", "DAO"];
  
  const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  
  // Generate 3-4 character symbol
  const symbol = name.split(' ')
    .map(word => word[0].toUpperCase())
    .join('') + 
    Math.floor(Math.random() * 100).toString();
  
  return { name, symbol };
}

// Create token with retries
async function createToken(payer) {
  const { name, symbol } = generateTokenMetadata();
  const decimals = Math.floor(Math.random() * 4) + 6; // Random 6-9 decimals
  
  console.log(`🔨 Creating token: ${name} (${symbol}) with ${decimals} decimals`);
  
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📝 Creating token attempt ${attempt}/${maxRetries}...`);
      
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        null, // No freeze authority
        decimals
      );
      
      console.log(`✅ Token created successfully! Mint address: ${mint.toString()}`);
      
      return {
        mint,
        name,
        symbol,
        decimals,
        payer
      };
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to create token after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      console.log(`⏳ Waiting before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Distribute tokens to accounts
async function distributeTokens(tokenInfo) {
  const { mint, payer, decimals } = tokenInfo;
  
  if (!fs.existsSync('accounts.json')) {
    console.error("❌ accounts.json not found. Please create accounts first.");
    return false;
  }
  
  const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
  console.log(`📋 Found ${accounts.length} accounts to distribute tokens to`);
  
  // Create supply - 1 billion tokens
  const totalSupply = 1_000_000_000;
  const totalSupplyWithDecimals = totalSupply * Math.pow(10, decimals);
  
  console.log(`💰 Creating token supply: ${totalSupply.toLocaleString()} tokens`);
  
  try {
    // First create a token account for the payer
    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );
    
    console.log(`✅ Created token account for source wallet: ${payerTokenAccount.address.toString()}`);
    
    // Mint the total supply to the payer
    console.log(`🖨️ Minting ${totalSupply.toLocaleString()} tokens to source wallet...`);
    await mintTo(
      connection,
      payer,
      mint,
      payerTokenAccount.address,
      payer,
      totalSupplyWithDecimals
    );
    
    console.log(`✅ Minted ${totalSupply.toLocaleString()} tokens to source wallet`);
    
    // Save token info
    const tokenInfo = {
      mint: mint.toString(),
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: decimals,
      totalSupply: totalSupply
    };
    
    // Create public directory if it doesn't exist
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    
    // Save token info to file
    fs.writeFileSync('public/token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log(`📝 Token info saved to public/token-info.json`);
    
    // Distribute tokens to accounts
    console.log(`🚀 Starting token distribution to ${accounts.length} accounts...`);
    
    // Determine whale vs retail accounts
    const whaleCount = Math.floor(accounts.length * 0.4); // 40% whales
    const retailCount = accounts.length - whaleCount;     // 60% retail
    
    console.log(`📊 Distribution plan: ${whaleCount} whale accounts, ${retailCount} retail accounts`);
    
    // Calculate allocations
    const whalePercentage = 0.6; // Whales get 60% of supply
    const retailPercentage = 0.4; // Retail gets 40% of supply
    
    const whaleTokens = totalSupply * whalePercentage;
    const retailTokens = totalSupply * retailPercentage;
    
    // Track successful transfers
    let successfulTransfers = 0;
    let totalDistributed = 0;
    
    // Batch processing
    const BATCH_SIZE = 5;
    const batches = Math.ceil(accounts.length / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, accounts.length);
      const batchAccounts = accounts.slice(start, end);
      
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches} (accounts ${start + 1}-${end})...`);
      
      // Process accounts in this batch concurrently
      const promises = batchAccounts.map(async (account, index) => {
        const accountIndex = start + index;
        const isWhale = accountIndex < whaleCount;
        
        let allocation;
        if (isWhale) {
          // Whales get between 2-5% of total whale allocation each
          const percentage = 2 + Math.random() * 3; // 2-5%
          allocation = Math.floor((whaleTokens * percentage / 100) / whaleCount);
        } else {
          // Retail gets between 0.5-2% of total retail allocation each
          const percentage = 0.5 + Math.random() * 1.5; // 0.5-2%
          allocation = Math.floor((retailTokens * percentage / 100) / retailCount);
        }
        
        // Add some randomness (±10%)
        const variance = 1 + (Math.random() * 0.2 - 0.1); // 0.9-1.1
        allocation = Math.floor(allocation * variance);
        
        // Convert to token units with decimals
        const transferAmount = allocation * Math.pow(10, decimals);
        
        try {
          // Convert string secretKey to Uint8Array
          const secretKey = Uint8Array.from(account.secretKey);
          const accountKeypair = Keypair.fromSecretKey(secretKey);
          
          // Create token account for the recipient
          const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            accountKeypair.publicKey
          );
          
          // Transfer tokens
          console.log(`💸 Transferring ${allocation.toLocaleString()} tokens to ${accountKeypair.publicKey.toString()} (${isWhale ? 'Whale' : 'Retail'})`);
          
          await transfer(
            connection,
            payer,
            payerTokenAccount.address,
            recipientTokenAccount.address,
            payer,
            transferAmount
          );
          
          successfulTransfers++;
          totalDistributed += allocation;
          console.log(`✅ Transfer successful!`);
          
          return {
            publicKey: accountKeypair.publicKey.toString(),
            allocation,
            isWhale,
            success: true
          };
        } catch (error) {
          console.error(`❌ Failed to transfer to account ${accountIndex}:`, error.message);
          return {
            publicKey: account.publicKey,
            allocation: 0,
            isWhale,
            success: false,
            error: error.message
          };
        }
      });
      
      await Promise.all(promises);
      
      // Add a small delay between batches to avoid rate limiting
      if (batchIndex < batches - 1) {
        console.log(`⏱️ Waiting briefly before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ Token distribution complete!`);
    console.log(`📊 Summary:`);
    console.log(`- Successful transfers: ${successfulTransfers}/${accounts.length}`);
    console.log(`- Total tokens distributed: ${totalDistributed.toLocaleString()} of ${totalSupply.toLocaleString()}`);
    console.log(`- Percentage distributed: ${((totalDistributed / totalSupply) * 100).toFixed(2)}%`);
    
    return true;
  } catch (error) {
    console.error("❌ Error distributing tokens:", error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log("🚀 Starting token creation on Solana devnet...");
  
  try {
    // 1. Get source wallet
    const sourceWallet = await getSourceWallet();
    
    // 2. Check wallet balance
    const hasEnoughBalance = await checkBalance(sourceWallet);
    if (!hasEnoughBalance) {
      return;
    }
    
    // 3. Create token
    console.log("\n🪙 Creating new SPL token...");
    const tokenInfo = await createToken(sourceWallet);
    
    // 4. Distribute tokens
    console.log("\n🔄 Distributing tokens to accounts...");
    await distributeTokens(tokenInfo);
    
    console.log("\n🎉 Process completed successfully!");
  } catch (error) {
    console.error("❌ An error occurred:", error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 