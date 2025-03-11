#!/bin/bash

# Enable better error handling
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}       SOLANA TRADING SIMULATOR SETUP SCRIPT            ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo -e "${YELLOW}This script will guide you through setting up the Solana Trading Simulator${NC}"
echo -e "${YELLOW}Make sure you have the Solana CLI installed and configured for devnet${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if process is running on port
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

# Function to wait for server
wait_for_server() {
  local port=$1
  local max_attempts=$2
  local attempts=0
  
  echo -e "${YELLOW}Waiting for server on port $port...${NC}"
  
  while [ $attempts -lt $max_attempts ]; do
    if is_port_in_use "$port"; then
      echo -e "${GREEN}Server is running on port $port!${NC}"
      return 0
    fi
    
    attempts=$((attempts+1))
    echo -e "${YELLOW}Attempt $attempts/$max_attempts - Server not yet available...${NC}"
    sleep 1
  done
  
  echo -e "${RED}Server failed to start after $max_attempts attempts!${NC}"
  return 1
}

# Check for Solana CLI
if ! command_exists solana; then
  echo -e "${RED}Solana CLI not found. Please install it first.${NC}"
  echo -e "${YELLOW}Visit: https://docs.solanalabs.com/cli/install${NC}"
  exit 1
fi

# Check Solana configuration
echo -e "${PURPLE}Step 1: Checking Solana configuration${NC}"
SOLANA_NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')

if [[ $SOLANA_NETWORK != *"devnet"* ]]; then
  echo -e "${YELLOW}Solana is not configured for devnet. Setting up devnet configuration...${NC}"
  solana config set --url https://api.devnet.solana.com
  echo -e "${GREEN}Solana configured for devnet!${NC}"
else
  echo -e "${GREEN}Solana already configured for devnet!${NC}"
fi

# Create accounts
echo -e "\n${PURPLE}Step 2: Creating Solana accounts${NC}"
if [ -f "accounts.json" ]; then
  echo -e "${YELLOW}accounts.json already exists. Do you want to create new accounts? (y/n)${NC}"
  read -r CREATE_NEW_ACCOUNTS
  
  if [[ $CREATE_NEW_ACCOUNTS == "y" ]]; then
    echo -e "${YELLOW}Creating new accounts...${NC}"
    npm run create-accounts-js
  else
    echo -e "${GREEN}Using existing accounts.${NC}"
  fi
else
  echo -e "${YELLOW}Creating Solana accounts...${NC}"
  npm run create-accounts-js
fi

# Verify accounts
echo -e "\n${PURPLE}Step 3: Verifying accounts${NC}"
npm run test-accounts-js

# Create source wallet
echo -e "\n${PURPLE}Step 4: Creating source wallet${NC}"
if [ -f "source-wallet.json" ]; then
  echo -e "${YELLOW}source-wallet.json already exists. Do you want to create a new source wallet? (y/n)${NC}"
  read -r CREATE_NEW_SOURCE_WALLET
  
  if [[ $CREATE_NEW_SOURCE_WALLET == "y" ]]; then
    echo -e "${YELLOW}Creating new source wallet...${NC}"
    npm run create-source-wallet
  else
    echo -e "${GREEN}Using existing source wallet.${NC}"
  fi
else
  echo -e "${YELLOW}Creating source wallet...${NC}"
  npm run create-source-wallet
fi

# Fund source wallet
echo -e "\n${PURPLE}Step 5: Funding source wallet${NC}"
SOURCE_WALLET_PUBKEY=$(node -e "console.log(JSON.parse(require('fs').readFileSync('source-wallet.json'))[0])" 2>/dev/null)
if [ -z "$SOURCE_WALLET_PUBKEY" ]; then
  SOURCE_WALLET_PUBKEY=$(node -e "console.log(require('fs').readFileSync('source-wallet.json', 'utf8').trim())" 2>/dev/null)
fi

if [ -n "$SOURCE_WALLET_PUBKEY" ]; then
  echo -e "${YELLOW}Requesting airdrop for source wallet...${NC}"
  solana airdrop 2 "$SOURCE_WALLET_PUBKEY" --url https://api.devnet.solana.com
  
  echo -e "${YELLOW}Checking source wallet balance...${NC}"
  solana balance "$SOURCE_WALLET_PUBKEY" --url https://api.devnet.solana.com
else
  echo -e "${RED}Could not determine source wallet public key. Please fund it manually.${NC}"
fi

# Distribute SOL to all accounts
echo -e "\n${PURPLE}Step 6: Distributing SOL to accounts${NC}"
echo -e "${YELLOW}Each account will receive 0.05 SOL${NC}"
npm run distribute-sol -- ./source-wallet.json 0.05

# Create and distribute token
echo -e "\n${PURPLE}Step 7: Creating and distributing token${NC}"
echo -e "${YELLOW}This will create a new SPL token and distribute it to all accounts${NC}"
echo -e "${YELLOW}This may take some time. Please be patient.${NC}"

node create-real-token.js

# Update token balance
echo -e "\n${PURPLE}Step 8: Starting the application${NC}"
echo -e "${YELLOW}Starting the backend server...${NC}"

# Start backend in background
node src/server.js &
SERVER_PID=$!

# Wait for server to start
wait_for_server 3001 10

# Check if server started successfully
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Backend server started successfully!${NC}"
  
  echo -e "${YELLOW}Starting the frontend...${NC}"
  echo -e "${GREEN}To use the trading simulator:${NC}"
  echo -e "1. Use the Admin tab to run trading patterns"
  echo -e "2. View account balances and transactions in the UI"
  echo -e "3. Monitor trading activity in real-time"
  echo -e "${YELLOW}Starting React frontend...${NC}"
  
  npm start
  
  # When the frontend exits, kill the backend
  kill $SERVER_PID
else
  echo -e "${RED}Failed to start backend server. Please check the logs for errors.${NC}"
  
  # Kill the server if it's still running
  if ps -p $SERVER_PID > /dev/null; then
    kill $SERVER_PID
  fi
  
  exit 1
fi 