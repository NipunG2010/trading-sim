#!/bin/bash

# Enable better error handling
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}     SOLANA TRADING SIMULATOR - QUICK START (NO PROMPTS)  ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
is_port_in_use() {
  if command_exists lsof; then
    lsof -i:"$1" >/dev/null 2>&1
  elif command_exists netstat; then
    netstat -tuln | grep -q ":$1 "
  else
    # If we can't check, assume it's not running
    return 1
  fi
}

# Check for Solana CLI
if ! command_exists solana; then
  echo -e "${RED}Solana CLI not found. Please install it first:${NC}"
  echo -e "${YELLOW}Visit: https://docs.solanalabs.com/cli/install${NC}"
  exit 1
fi

# Check Solana configuration
SOLANA_NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')

if [[ $SOLANA_NETWORK != *"devnet"* ]]; then
  echo -e "${YELLOW}Solana is not configured for devnet. Setting up devnet configuration...${NC}"
  solana config set --url https://api.devnet.solana.com
  echo -e "${GREEN}Solana configured for devnet!${NC}"
else
  echo -e "${GREEN}Solana already configured for devnet!${NC}"
fi

# Create necessary directories
mkdir -p public

echo "📋 Checking project setup..."

# Determine what needs to be done
NEEDS_ACCOUNTS=false
if [ ! -f "accounts.json" ]; then
  NEEDS_ACCOUNTS=true
fi

NEEDS_SOURCE_WALLET=false
if [ ! -f "source-wallet.json" ]; then
  NEEDS_SOURCE_WALLET=true
fi

NEEDS_SOL_DISTRIBUTION=false
if [ "$NEEDS_ACCOUNTS" = true ] || [ "$NEEDS_SOURCE_WALLET" = true ]; then
  NEEDS_SOL_DISTRIBUTION=true
fi

NEEDS_TOKEN_CREATION=false
if [ ! -f "public/token-info.json" ]; then
  NEEDS_TOKEN_CREATION=true
elif grep -q "DummyMintAddressReplace" "public/token-info.json" 2>/dev/null; then
  NEEDS_TOKEN_CREATION=true
fi

# Create accounts if needed
if [ "$NEEDS_ACCOUNTS" = true ]; then
  echo -e "${YELLOW}Creating Solana accounts...${NC}"
  npm run create-accounts-js || { echo -e "${RED}Failed to create accounts.${NC}"; exit 1; }
  echo -e "${GREEN}Accounts created successfully!${NC}"
else
  # NO PROMPT - Just use existing accounts
  echo -e "${GREEN}Using existing accounts.${NC}"
fi

# Create source wallet if needed
if [ "$NEEDS_SOURCE_WALLET" = true ]; then
  echo -e "${YELLOW}Creating source wallet...${NC}"
  npm run create-source-wallet || { echo -e "${RED}Failed to create source wallet.${NC}"; exit 1; }
  echo -e "${GREEN}Source wallet created successfully!${NC}"
  NEEDS_SOL_DISTRIBUTION=true
else
  # NO PROMPT - Just use existing source wallet
  echo -e "${GREEN}Using existing source wallet.${NC}"
fi

# Verify accounts
echo -e "${YELLOW}Verifying accounts...${NC}"
npm run test-accounts-js || { echo -e "${RED}Account verification failed.${NC}"; exit 1; }
echo -e "${GREEN}Accounts verified successfully!${NC}"

# Fund source wallet
if [ "$NEEDS_SOL_DISTRIBUTION" = true ]; then
  echo -e "${YELLOW}Funding source wallet...${NC}"
  # Try direct access first, then try to parse with node if needed
  if [ -f "source-wallet.json" ]; then
    SOURCE_WALLET_RAW=$(cat source-wallet.json)
    if [[ $SOURCE_WALLET_RAW == *"publicKey"* ]]; then
      SOURCE_WALLET_PUBKEY=$(node -e "try { const wallet = require('./source-wallet.json'); console.log(Array.isArray(wallet) ? wallet[0].publicKey : wallet.publicKey); } catch (e) { process.exit(1); }")
    else
      # If it's just an array, it might be older format
      SOURCE_WALLET_PUBKEY=$(node -e "try { const wallet = require('./source-wallet.json'); const keypair = Array.isArray(wallet) ? wallet : JSON.parse(wallet); const { Keypair } = require('@solana/web3.js'); const pair = Keypair.fromSecretKey(Uint8Array.from(keypair)); console.log(pair.publicKey.toString()); } catch (e) { console.error(e); process.exit(1); }")
    fi
  fi
  
  if [ -n "$SOURCE_WALLET_PUBKEY" ]; then
    echo -e "${YELLOW}Requesting airdrop for source wallet ($SOURCE_WALLET_PUBKEY)...${NC}"
    solana airdrop 2 "$SOURCE_WALLET_PUBKEY" --url https://api.devnet.solana.com
    
    echo -e "${YELLOW}Checking source wallet balance...${NC}"
    BALANCE=$(solana balance "$SOURCE_WALLET_PUBKEY" --url https://api.devnet.solana.com | awk '{print $1}')
    
    echo -e "${GREEN}Current balance: $BALANCE SOL${NC}"
    
    # Try to get enough SOL for operations
    ATTEMPT=1
    MAX_ATTEMPTS=3
    
    while (( $(echo "$BALANCE < 0.5" | bc -l 2>/dev/null || echo 1) )) && [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
      echo -e "${YELLOW}Source wallet balance is low. Requesting another airdrop (attempt $ATTEMPT)...${NC}"
      solana airdrop 2 "$SOURCE_WALLET_PUBKEY" --url https://api.devnet.solana.com
      sleep 2
      BALANCE=$(solana balance "$SOURCE_WALLET_PUBKEY" --url https://api.devnet.solana.com | awk '{print $1}')
      ATTEMPT=$((ATTEMPT+1))
    done
  else
    echo -e "${RED}Could not determine source wallet public key. Please fund it manually.${NC}"
    exit 1
  fi
fi

# Distribute SOL to accounts if needed
if [ "$NEEDS_SOL_DISTRIBUTION" = true ]; then
  echo -e "${YELLOW}Distributing SOL to all accounts...${NC}"
  npm run distribute-sol -- ./source-wallet.json 0.05 || { 
    echo -e "${RED}Failed to distribute SOL to accounts.${NC}"
    echo -e "${YELLOW}This might be due to rate limiting. Waiting 5 seconds and trying again...${NC}"
    sleep 5
    npm run distribute-sol -- ./source-wallet.json 0.05 || { 
      echo -e "${RED}Failed to distribute SOL to accounts after retry.${NC}"
      exit 1
    }
  }
  echo -e "${GREEN}SOL distributed successfully!${NC}"
fi

# Create and distribute token
if [ "$NEEDS_TOKEN_CREATION" = true ]; then
  # NO PROMPT - Always create new token if needed
  echo -e "${YELLOW}Creating and distributing a new token on Solana devnet...${NC}"
  echo -e "${YELLOW}This may take some time. Please be patient.${NC}"
  
  if [ -f "create-real-token.js" ]; then
    echo -e "${YELLOW}Running token creation script...${NC}"
    node create-real-token.js || { echo -e "${RED}Token creation failed.${NC}"; exit 1; }
  else
    echo -e "${YELLOW}Creating temporary token creation script...${NC}"
    
    # Create inline token creation and distribution script
    cat > temp-token-creator.js << 'EOL'
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from "@solana/spl-token";
import * as fs from "fs";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function main() {
  try {
    console.log("✅ Loading source wallet...");
    const sourceWalletData = JSON.parse(fs.readFileSync('source-wallet.json', 'utf8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(sourceWalletData));
    
    console.log("✅ Generating token metadata...");
    const prefixes = ["Luna", "Solar", "Cosmic", "Quantum", "Nexus"];
    const suffixes = ["Coin", "Token", "Cash", "Pay", "DAO"];
    const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    const symbol = name.split(' ').map(word => word[0]).join('') + Math.floor(Math.random() * 100);
    const decimals = Math.floor(Math.random() * 4) + 6; // 6-9 decimals
    
    console.log(`✅ Creating token: ${name} (${symbol}) with ${decimals} decimals`);
    
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      decimals
    );
    
    console.log(`✅ Token created successfully! Mint address: ${mint.toString()}`);
    
    const totalSupply = 1_000_000_000;
    const totalSupplyWithDecimals = totalSupply * Math.pow(10, decimals);
    
    console.log(`✅ Creating token account for source wallet...`);
    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );
    
    console.log(`✅ Minting ${totalSupply.toLocaleString()} tokens to source wallet...`);
    await mintTo(
      connection,
      payer,
      mint,
      payerTokenAccount.address,
      payer,
      totalSupplyWithDecimals
    );
    
    // Save token info
    const tokenInfo = {
      mint: mint.toString(),
      name,
      symbol,
      decimals,
      totalSupply
    };
    
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    
    fs.writeFileSync('public/token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log(`✅ Token info saved to public/token-info.json`);
    
    if (!fs.existsSync('accounts.json')) {
      console.log(`❌ accounts.json not found. Skipping token distribution.`);
      return;
    }
    
    console.log(`✅ Distributing tokens to accounts...`);
    const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    const batchSize = 10;
    let successCount = 0;
    
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);
      
      console.log(`✅ Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(accounts.length/batchSize)}...`);
      
      const promises = batch.map(async (account) => {
        try {
          const allocation = Math.floor(Math.random() * totalSupply * 0.02) + 1000; // Random amount up to 2% of supply
          const recipientKeypair = Keypair.fromSecretKey(new Uint8Array(account.secretKey));
          
          const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            recipientKeypair.publicKey
          );
          
          await transfer(
            connection,
            payer,
            payerTokenAccount.address,
            recipientTokenAccount.address,
            payer,
            allocation * Math.pow(10, decimals)
          );
          
          successCount++;
          console.log(`✅ Transferred ${allocation.toLocaleString()} tokens to ${recipientKeypair.publicKey.toString()}`);
          return true;
        } catch (error) {
          console.error(`❌ Failed to transfer to account: ${error.message}`);
          return false;
        }
      });
      
      await Promise.all(promises);
      
      // Short delay between batches
      if (i + batchSize < accounts.length) {
        console.log(`⏱️ Waiting briefly before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Token distribution complete! ${successCount}/${accounts.length} transfers succeeded.`);
    
  } catch (error) {
    console.error(`❌ Error creating token:`, error);
    process.exit(1);
  }
}

main();
EOL
    
    echo -e "${YELLOW}Running temporary token creation script...${NC}"
    node temp-token-creator.js || { echo -e "${RED}Token creation failed.${NC}"; exit 1; }
    rm temp-token-creator.js
  fi
  
  echo -e "${GREEN}Token created and distributed successfully!${NC}"
else
  echo -e "${GREEN}Token already exists. Using existing token.${NC}"
fi

# Start the application
echo -e "${YELLOW}Starting the Solana Trading Simulator application...${NC}"

# Create a trap to ensure we kill the server process when script exits
trap 'echo -e "${YELLOW}Shutting down server...${NC}"; kill $SERVER_PID 2>/dev/null || true' EXIT

# Start backend server in background
echo -e "${YELLOW}Starting backend server...${NC}"
node src/server.js &
SERVER_PID=$!

# Wait for backend server to start
echo -e "${YELLOW}Waiting for backend server to start...${NC}"
ATTEMPTS=0
MAX_ATTEMPTS=30
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if is_port_in_use 3001; then
    echo -e "${GREEN}Backend server started successfully!${NC}"
    break
  fi
  ATTEMPTS=$((ATTEMPTS+1))
  echo -e "${YELLOW}Waiting for server to start (attempt $ATTEMPTS/$MAX_ATTEMPTS)...${NC}"
  sleep 1
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo -e "${RED}Failed to start backend server after $MAX_ATTEMPTS attempts.${NC}"
  echo -e "${RED}Please check for errors in the server logs.${NC}"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# Start React frontend
echo -e "${GREEN}Starting React frontend application...${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}             Trading Simulator is starting                ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo -e "${GREEN}Use the UI to:${NC}"
echo -e "${GREEN}- Monitor token trading activity${NC}"
echo -e "${GREEN}- View account balances and transactions${NC}"
echo -e "${GREEN}- Run trading patterns from the admin tab${NC}"
echo -e "${BLUE}=========================================================${NC}"

npm start

# The trap will handle killing the backend server when the frontend exits 