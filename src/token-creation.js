// src/token-creation.js
import { 
  Connection, 
  Keypair, 
  PublicKey,
  sendAndConfirmTransaction,
  Transaction
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

/**
 * Generate a random token name and symbol
 * Creates professional sounding token names with market-friendly symbols
 */
function generateTokenMetadata() {
  const prefixes = ["Lunar", "Cosmic", "Quantum", "Nexus", "Stellar", "Astro", "Crypto", "Digi", "Meta", "Hyper", "Orbit", "Solar", "Nova", "Pixel", "Ultra"];
  const suffixes = ["Protocol", "Network", "Finance", "Chain", "Swap", "Verse", "Yield", "Capital", "Coin", "Token", "DAO", "DeFi", "Exchange", "Markets", "Labs"];
  
  const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  
  // Generate 4-5 character symbol
  const symbolLength = Math.random() > 0.5 ? 4 : 5;
  const symbol = name.split(' ')
    .map(word => word[0])
    .join('')
    .padEnd(symbolLength, name.replace(/[aeiou]/gi, '').substring(0, symbolLength - 2))
    .toUpperCase();
  
  return { name, symbol };
}

/**
 * Create a new SPL token
 * Handles error retries and provides detailed progress logs
 */
export async function createToken(
  connection,
  payer,
  mintAuthority = payer.publicKey,
  freezeAuthority = null
) {
  try {
    console.log("Creating new SPL token...");
    
    // Generate random decimals between 6-9
    const decimals = Math.floor(Math.random() * 4) + 6;
    console.log(`Using ${decimals} decimals for token`);
    
    // Generate token metadata
    const { name, symbol } = generateTokenMetadata();
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    
    // Check payer balance to ensure they have enough SOL
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Payer balance: ${balance / 1000000000} SOL`);
    
    if (balance < 10000000) { // 0.01 SOL
      throw new Error("Payer account has insufficient SOL balance. Minimum 0.01 SOL required.");
    }
    
    // Create the token
    console.log("Creating token mint on Solana...");
    let mint;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        mint = await createMint(
          connection,
          payer,
          mintAuthority,
          freezeAuthority,
          decimals
        );
        console.log(`Token mint created: ${mint.toString()}`);
        break;
      } catch (err) {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts} failed: ${err.message}`);
        if (attempts >= maxAttempts) throw err;
        
        // Short backoff before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      mint,
      payer,
      mintAuthority,
      name,
      symbol,
      decimals
    };
  } catch (error) {
    console.error("❌ Error creating token:", error);
    throw error;
  }
}

/**
 * Distribute tokens to wallets
 * Implements batching and rate limiting to avoid Solana rate limit errors
 */
export async function distributeTokens(
  connection,
  mint,
  mintAuthority,
  wallets
) {
  try {
    console.log(`Starting token distribution to ${wallets.length} wallets...`);
    
    // Total supply: 1 billion tokens
    const totalSupply = 1_000_000_000;
    console.log(`Total supply: ${totalSupply.toLocaleString()} tokens`);
    
    // Create source token account
    console.log("Creating source token account...");
    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      mint,
      mintAuthority.publicKey
    );
    
    console.log(`Source token account: ${sourceTokenAccount.address.toString()}`);
    
    // Mint all tokens to source account
    console.log("Minting tokens to source account...");
    await mintTo(
      connection,
      mintAuthority,
      mint,
      sourceTokenAccount.address,
      mintAuthority.publicKey,
      totalSupply * (10 ** (await getMint(connection, mint)).decimals)
    );
    
    console.log("✅ Total supply minted to source account");
    
    // Separate wallets into whale and retail accounts
    const whaleCount = Math.floor(wallets.length * 0.4); // 40% whales
    const retailCount = wallets.length - whaleCount;
    
    console.log(`Distributing to ${whaleCount} whale wallets and ${retailCount} retail wallets`);
    
    // Whale distribution (60% of supply)
    const whaleSupply = totalSupply * 0.6;
    console.log(`Total whale allocation: ${whaleSupply.toLocaleString()} tokens (60% of supply)`);
    
    // Retail distribution (40% of supply)
    const retailSupply = totalSupply * 0.4;
    console.log(`Total retail allocation: ${retailSupply.toLocaleString()} tokens (40% of supply)`);
    
    let successfulTransfers = 0;
    let transferredTokens = 0;
    
    // Process in larger batches to improve performance
    const BATCH_SIZE = 10;
    
    // Pre-calculate token decimals to avoid repeated calls
    const tokenDecimals = (await getMint(connection, mint)).decimals;
    const decimalMultiplier = 10 ** tokenDecimals;
    
    // Create a function to handle token transfers with retries
    async function transferWithRetry(destinationWallet, amount, walletType, walletIndex, maxRetries = 3) {
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const walletTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            mintAuthority,
            mint,
            destinationWallet.publicKey
          );
          
          await transfer(
            connection,
            mintAuthority,
            sourceTokenAccount.address,
            walletTokenAccount.address,
            mintAuthority.publicKey,
            amount * decimalMultiplier
          );
          
          return { success: true };
        } catch (error) {
          retries++;
          console.error(`Transfer attempt ${retries}/${maxRetries} failed for ${walletType} wallet ${walletIndex}: ${error.message}`);
          
          if (retries >= maxRetries) {
            return { success: false, error: error.message };
          }
          
          // Short backoff before retry (50ms)
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
    
    // Distribute to whale accounts first (in parallel batches)
    console.log("Distributing to whale accounts...");
    
    for (let i = 0; i < whaleCount; i += BATCH_SIZE) {
      const batchWallets = wallets.slice(i, Math.min(i + BATCH_SIZE, whaleCount));
      const batchPromises = batchWallets.map(async (wallet, index) => {
        try {
          // Whale accounts get 2-5% of total supply each
          const percentage = 2 + (Math.random() * 3);
          const amount = Math.floor(totalSupply * (percentage / 100));
          
          const transferResult = await transferWithRetry(
            wallet, 
            amount, 
            'whale', 
            i + index + 1
          );
          
          if (transferResult.success) {
            transferredTokens += amount;
            successfulTransfers++;
            console.log(`Transferred ${amount.toLocaleString()} tokens (${percentage.toFixed(2)}%) to whale wallet ${i + index + 1}/${whaleCount}`);
            return { success: true, wallet: wallet.publicKey.toString(), amount, type: 'whale' };
          } else {
            console.error(`❌ Failed to transfer to whale wallet ${i + index + 1} after retries: ${transferResult.error}`);
            return { success: false, wallet: wallet.publicKey.toString(), error: transferResult.error, type: 'whale' };
          }
        } catch (error) {
          console.error(`❌ Error transferring to whale wallet ${i + index + 1}:`, error.message);
          return { success: false, wallet: wallet.publicKey.toString(), error: error.message, type: 'whale' };
        }
      });
      
      await Promise.all(batchPromises);
      
      // Minimal delay between batches (100ms)
      if (i + BATCH_SIZE < whaleCount) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Distribute to retail accounts (in parallel batches)
    console.log("Distributing to retail accounts...");
    
    for (let i = whaleCount; i < wallets.length; i += BATCH_SIZE) {
      const batchWallets = wallets.slice(i, Math.min(i + BATCH_SIZE, wallets.length));
      const batchPromises = batchWallets.map(async (wallet, index) => {
        try {
          // Retail accounts get 0.5-2% of total supply each
          const percentage = 0.5 + (Math.random() * 1.5);
          const amount = Math.floor(totalSupply * (percentage / 100));
          
          const transferResult = await transferWithRetry(
            wallet, 
            amount, 
            'retail', 
            i - whaleCount + index + 1
          );
          
          if (transferResult.success) {
            transferredTokens += amount;
            successfulTransfers++;
            console.log(`Transferred ${amount.toLocaleString()} tokens (${percentage.toFixed(2)}%) to retail wallet ${i - whaleCount + index + 1}/${retailCount}`);
            return { success: true, wallet: wallet.publicKey.toString(), amount, type: 'retail' };
          } else {
            console.error(`❌ Failed to transfer to retail wallet ${i - whaleCount + index + 1} after retries: ${transferResult.error}`);
            return { success: false, wallet: wallet.publicKey.toString(), error: transferResult.error, type: 'retail' };
          }
        } catch (error) {
          console.error(`❌ Error transferring to retail wallet ${i - whaleCount + index + 1}:`, error.message);
          return { success: false, wallet: wallet.publicKey.toString(), error: error.message, type: 'retail' };
        }
      });
      
      await Promise.all(batchPromises);
      
      // Minimal delay between batches (100ms)
      if (i + BATCH_SIZE < wallets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Token distribution complete: ${successfulTransfers}/${wallets.length} successful transfers`);
    console.log(`Total tokens distributed: ${transferredTokens.toLocaleString()} (${(transferredTokens / totalSupply * 100).toFixed(2)}% of supply)`);
    
    return {
      mint: mint.toString(),
      transfers: successfulTransfers,
      totalDistributed: transferredTokens
    };
  } catch (error) {
    console.error("❌ Error distributing tokens:", error);
    throw error;
  }
}

/**
 * Save token information to a JSON file
 */
export function saveTokenInfo(
  mint,
  config
) {
  try {
    const tokenInfo = {
      mint: mint.toString(),
      name: config.name,
      symbol: config.symbol,
      decimals: config.decimals,
      totalSupply: 1_000_000_000
    };
    
    // Save to public directory for easy access from the frontend
    fs.mkdirSync('public', { recursive: true });
    fs.writeFileSync('public/token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("✅ Token info saved to public/token-info.json");
    
    // Also save to root directory for easier access from Node.js scripts
    fs.writeFileSync('token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log("✅ Token info saved to token-info.json");
    
    return tokenInfo;
  } catch (error) {
    console.error("❌ Error saving token info:", error);
    throw error;
  }
}

/**
 * Complete token setup process
 * Creates a token and distributes it to all accounts
 */
export async function setupToken(connection) {
  try {
    console.log("📣 Starting token setup process...");
    
    // Check if accounts exist
    if (!fs.existsSync('accounts.json')) {
      throw new Error("No accounts found. Please create accounts first using 'npm run create-accounts-js'");
    }
    
    console.log("📂 Loading accounts from accounts.json...");
    
    // Read account data
    const accountsData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    console.log(`📊 Loaded ${accountsData.length} accounts`);
    
    // Create keypairs from account data with robust error handling
    const wallets = accountsData.map((account, index) => {
      try {
        console.log(`Processing account ${index + 1}/${accountsData.length}: ${account.publicKey}`);
        
        // Handle different formats of secretKey
        let secretKeyBuffer;
        
        if (typeof account.secretKey === 'string') {
          // Handle base64 string format
          secretKeyBuffer = Buffer.from(account.secretKey, 'base64');
          console.log(`  Account ${index + 1} has string secretKey (base64)`);
        } else if (Array.isArray(account.secretKey)) {
          // Handle array format
          secretKeyBuffer = Uint8Array.from(account.secretKey);
          console.log(`  Account ${index + 1} has array secretKey`);
        } else {
          throw new Error(`Account ${index + 1} has invalid secretKey format: ${typeof account.secretKey}`);
        }
        
        // Validate secretKey length
        if (secretKeyBuffer.length !== 64) {
          throw new Error(`Account ${index + 1} has invalid secretKey length: ${secretKeyBuffer.length}, expected 64`);
        }
        
        // Create keypair
        const keypair = Keypair.fromSecretKey(secretKeyBuffer);
        
        // Verify public key matches
        if (keypair.publicKey.toString() !== account.publicKey) {
          console.warn(`  ⚠️ Warning: Account ${index + 1} public key mismatch: ${keypair.publicKey.toString()} vs ${account.publicKey}`);
        } else {
          console.log(`  ✅ Account ${index + 1} keypair successfully created`);
        }
        
        return {
          publicKey: new PublicKey(account.publicKey),
          secretKey: secretKeyBuffer,
          keypair: keypair,
          type: account.type || (index < Math.floor(accountsData.length * 0.4) ? 'whale' : 'retail')
        };
      } catch (error) {
        console.error(`❌ Error processing account ${index + 1} (${account.publicKey}): ${error.message}`);
        throw new Error(`Failed to process account ${index + 1}: ${error.message}`);
      }
    });
    
    // Check if we have a payer wallet (create one if not)
    let payer;
    if (fs.existsSync('source-wallet.json')) {
      console.log("💼 Loading source wallet...");
      try {
        const sourceWalletData = JSON.parse(fs.readFileSync('source-wallet.json', 'utf8'));
        
        // Handle different formats of secretKey for source wallet
        let sourceSecretKeyBuffer;
        
        if (typeof sourceWalletData.secretKey === 'string') {
          // Handle base64 string format
          sourceSecretKeyBuffer = Buffer.from(sourceWalletData.secretKey, 'base64');
          console.log("  Source wallet has string secretKey (base64)");
        } else if (Array.isArray(sourceWalletData.secretKey)) {
          // Handle array format
          sourceSecretKeyBuffer = Uint8Array.from(sourceWalletData.secretKey);
          console.log("  Source wallet has array secretKey");
        } else {
          throw new Error(`Source wallet has invalid secretKey format: ${typeof sourceWalletData.secretKey}`);
        }
        
        // Validate secretKey length
        if (sourceSecretKeyBuffer.length !== 64) {
          throw new Error(`Source wallet has invalid secretKey length: ${sourceSecretKeyBuffer.length}, expected 64`);
        }
        
        // Create keypair
        payer = Keypair.fromSecretKey(sourceSecretKeyBuffer);
        
        // Verify public key matches
        if (payer.publicKey.toString() !== sourceWalletData.publicKey) {
          console.warn(`⚠️ Warning: Source wallet public key mismatch: ${payer.publicKey.toString()} vs ${sourceWalletData.publicKey}`);
        } else {
          console.log(`💰 Source wallet loaded: ${payer.publicKey.toString()}`);
        }
      } catch (error) {
        console.error(`❌ Error loading source wallet: ${error.message}`);
        throw new Error(`Failed to load source wallet: ${error.message}`);
      }
    } else {
      console.log("⚠️ No source wallet found. Creating a new one...");
      payer = Keypair.generate();
      const walletData = {
        publicKey: payer.publicKey.toString(),
        secretKey: Buffer.from(payer.secretKey).toString('base64')
      };
      fs.writeFileSync('source-wallet.json', JSON.stringify(walletData, null, 2));
      console.log(`💰 Created new source wallet: ${payer.publicKey.toString()}`);
      console.log("⚠️ Please fund this wallet with SOL before continuing");
      
      // Don't proceed if we had to create a new wallet (it needs funding)
      throw new Error("New source wallet created. Please fund it with SOL and run this command again");
    }
    
    // Check payer balance
    const payerBalance = await connection.getBalance(payer.publicKey);
    console.log(`💰 Source wallet balance: ${payerBalance / 1000000000} SOL`);
    
    if (payerBalance < 10000000) { // 0.01 SOL
      throw new Error("Source wallet has insufficient SOL balance. Minimum 0.01 SOL required");
    }
    
    // Create token
    console.log("🪙 Creating token...");
    const tokenData = await createToken(connection, payer);
    console.log(`✅ Token created: ${tokenData.mint.toString()}`);
    
    // Distribute tokens
    console.log("📦 Distributing tokens to wallets...");
    const distributionResult = await distributeTokens(
      connection,
      tokenData.mint,
      payer,
      wallets.map(w => ({
        publicKey: w.publicKey,
        secretKey: w.secretKey,
        type: w.type
      }))
    );
    
    // Save token info for the UI
    console.log("💾 Saving token info...");
    saveTokenInfo(tokenData.mint, tokenData);
    
    console.log("✅ Token setup completed successfully!");
    return {
      mint: tokenData.mint.toString(),
      name: tokenData.name,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      transfers: distributionResult.transfers,
      totalDistributed: distributionResult.totalDistributed
    };
  } catch (error) {
    console.error("❌ Token setup failed:", error);
    throw error;
  }
} 