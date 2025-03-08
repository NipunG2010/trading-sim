// src/token-creation.ts
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
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

// Token configuration
interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number; // in base units (before decimals)
}

// Generate a random token name and symbol
function generateTokenMetadata(): { name: string, symbol: string } {
  const prefixes = ["Lunar", "Cosmic", "Quantum", "Nexus", "Stellar", "Astro", "Crypto", "Digi", "Meta", "Hyper"];
  const suffixes = ["Protocol", "Network", "Finance", "Chain", "Swap", "Verse", "Yield", "Capital", "Coin", "Token"];
  
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

// Create a new SPL token
export async function createToken(
  connection: Connection,
  payer: Keypair,
  mintAuthority: PublicKey = payer.publicKey,
  freezeAuthority: PublicKey | null = null
): Promise<{ mint: Keypair, config: TokenConfig }> {
  console.log("Creating new SPL token...");
  
  // Generate random decimals between 6-9
  const decimals = Math.floor(Math.random() * 4) + 6;
  console.log(`Using ${decimals} decimals for token`);
  
  // Generate token metadata
  const { name, symbol } = generateTokenMetadata();
  console.log(`Token Name: ${name}`);
  console.log(`Token Symbol: ${symbol}`);
  
  // Create mint account
  const mintAccount = Keypair.generate();
  console.log(`Mint Account: ${mintAccount.publicKey.toString()}`);
  
  // Create the token
  await createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals,
    mintAccount,
    undefined,
    TOKEN_PROGRAM_ID
  );
  
  console.log(`Token created successfully: ${mintAccount.publicKey.toString()}`);
  
  // Calculate total supply (1 billion tokens)
  const totalSupply = 1_000_000_000;
  
  // Return the mint account and token configuration
  return { 
    mint: mintAccount, 
    config: {
      name,
      symbol,
      decimals,
      totalSupply
    }
  };
}

// Distribute tokens to wallets
export async function distributeTokens(
  connection: Connection,
  mint: PublicKey,
  mintAuthority: Keypair,
  wallets: { publicKey: string, secretKey: string, type: 'whale' | 'retail' }[]
): Promise<void> {
  console.log(`Starting token distribution to ${wallets.length} wallets...`);
  
  // Load token info
  const tokenInfo = await getMint(connection, mint);
  const decimals = tokenInfo.decimals;
  
  // Calculate total supply with decimals
  const totalSupply = 1_000_000_000 * Math.pow(10, decimals);
  
  // Separate wallets by type
  const whaleWallets = wallets.filter(w => w.type === 'whale');
  const retailWallets = wallets.filter(w => w.type === 'retail');
  
  console.log(`Distribution: ${whaleWallets.length} whale wallets, ${retailWallets.length} retail wallets`);
  
  // Calculate distribution percentages
  // Whales get 60% ±3% of supply
  const whalePercentage = 0.6 + (Math.random() * 0.06 - 0.03);
  const retailPercentage = 1 - whalePercentage;
  
  console.log(`Whale allocation: ${(whalePercentage * 100).toFixed(2)}%`);
  console.log(`Retail allocation: ${(retailPercentage * 100).toFixed(2)}%`);
  
  // Calculate amounts for each wallet type
  const whaleSupply = Math.floor(totalSupply * whalePercentage);
  const retailSupply = totalSupply - whaleSupply;
  
  // Distribution tracking
  let distributedToWhales = 0;
  let distributedToRetail = 0;
  
  // Create token account for mint authority first
  const mintAuthorityTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    mintAuthority,
    mint,
    mintAuthority.publicKey
  );
  
  // Mint all tokens to mint authority first
  await mintTo(
    connection,
    mintAuthority,
    mint,
    mintAuthorityTokenAccount.address,
    mintAuthority,
    totalSupply
  );
  
  console.log(`Minted ${totalSupply / Math.pow(10, decimals)} tokens to mint authority`);
  
  // Distribute to whale wallets (2-5% each)
  for (const wallet of whaleWallets) {
    // Skip if we've distributed all whale supply
    if (distributedToWhales >= whaleSupply) break;
    
    // Random percentage between 2-5% of total supply
    const percentage = 0.02 + Math.random() * 0.03;
    let amount = Math.floor(totalSupply * percentage);
    
    // Ensure we don't exceed whale supply
    if (distributedToWhales + amount > whaleSupply) {
      amount = whaleSupply - distributedToWhales;
    }
    
    // Create token account for recipient
    const recipientKeypair = Keypair.fromSecretKey(Buffer.from(wallet.secretKey, 'base64'));
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      mint,
      new PublicKey(wallet.publicKey)
    );
    
    // Transfer tokens
    await transfer(
      connection,
      mintAuthority,
      mintAuthorityTokenAccount.address,
      recipientTokenAccount.address,
      mintAuthority,
      amount
    );
    
    distributedToWhales += amount;
    console.log(`Transferred ${amount / Math.pow(10, decimals)} tokens to whale wallet ${wallet.publicKey}`);
    
    // Random delay between transfers (1-10 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 9000));
  }
  
  // Distribute to retail wallets (0.5-2% each)
  for (const wallet of retailWallets) {
    // Skip if we've distributed all retail supply
    if (distributedToRetail >= retailSupply) break;
    
    // Random percentage between 0.5-2% of total supply
    const percentage = 0.005 + Math.random() * 0.015;
    let amount = Math.floor(totalSupply * percentage);
    
    // Ensure we don't exceed retail supply
    if (distributedToRetail + amount > retailSupply) {
      amount = retailSupply - distributedToRetail;
    }
    
    // Create token account for recipient
    const recipientKeypair = Keypair.fromSecretKey(Buffer.from(wallet.secretKey, 'base64'));
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      mint,
      new PublicKey(wallet.publicKey)
    );
    
    // Transfer tokens
    await transfer(
      connection,
      mintAuthority,
      mintAuthorityTokenAccount.address,
      recipientTokenAccount.address,
      mintAuthority,
      amount
    );
    
    distributedToRetail += amount;
    console.log(`Transferred ${amount / Math.pow(10, decimals)} tokens to retail wallet ${wallet.publicKey}`);
    
    // Random delay between transfers (1-10 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 9000));
  }
  
  console.log(`Token distribution complete!`);
  console.log(`Distributed to whales: ${distributedToWhales / Math.pow(10, decimals)} tokens (${(distributedToWhales / totalSupply * 100).toFixed(2)}%)`);
  console.log(`Distributed to retail: ${distributedToRetail / Math.pow(10, decimals)} tokens (${(distributedToRetail / totalSupply * 100).toFixed(2)}%)`);
  console.log(`Remaining with mint authority: ${(totalSupply - distributedToWhales - distributedToRetail) / Math.pow(10, decimals)} tokens`);
}

// Save token information to a file
export function saveTokenInfo(
  mint: PublicKey,
  config: TokenConfig
): void {
  const tokenData = {
    mint: mint.toString(),
    name: config.name,
    symbol: config.symbol,
    decimals: config.decimals,
    totalSupply: config.totalSupply
  };
  
  fs.writeFileSync("../token-info.json", JSON.stringify(tokenData, null, 2));
  console.log("Token information saved to token-info.json");
}

// Main function to create and distribute tokens
export async function setupToken(connection: Connection): Promise<void> {
  try {
    // Load accounts from file
    const accountData = JSON.parse(fs.readFileSync("../accounts.json", "utf-8"));
    
    // Use the first account as the payer and mint authority
    const payerData = accountData[0];
    const payer = Keypair.fromSecretKey(Buffer.from(payerData.secretKey, "base64"));
    
    console.log(`Using account ${payer.publicKey.toString()} as payer and mint authority`);
    
    // Create the token
    const { mint, config } = await createToken(connection, payer);
    
    // Save token information
    saveTokenInfo(mint.publicKey, config);
    
    // Categorize wallets as whale or retail
    // Use 40% of wallets as whales (20 wallets) and 60% as retail (30 wallets)
    const wallets = accountData.map((account: any, index: number) => ({
      publicKey: account.publicKey,
      secretKey: account.secretKey,
      type: index < 20 ? 'whale' : 'retail'
    }));
    
    // Distribute tokens
    await distributeTokens(connection, mint.publicKey, payer, wallets);
    
    console.log("Token setup completed successfully!");
  } catch (error) {
    console.error("Error setting up token:", error);
  }
} 