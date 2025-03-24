#!/bin/bash

echo "Starting Solana Trading Simulator..."

# Function to check if a command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 successful"
    else
        echo "❌ $1 failed"
        exit 1
    fi
}


# Create and validate accounts
echo "Creating accounts..."
npm run create-accounts-js
check_status "Account creation"

echo "Validating accounts..."
npm run test-accounts-js
check_status "Account validation"

# Create source wallet
echo "Creating source wallet..."
npm run create-source-wallet
check_status "Source wallet creation"

# Fund source wallet (requires manual airdrop)
echo "Please fund the source wallet using:"
echo "solana airdrop 2 <SOURCE_WALLET_PUBLIC_KEY> --url https://api.devnet.solana.com"
read -p "Press enter after funding the source wallet..."

# Distribute SOL
echo "Distributing SOL to accounts..."
npm run distribute-sol -- ./source-wallet.json 0.05
check_status "SOL distribution"

# Create and distribute token
echo "Creating and distributing token..."
npm run create-token-js
check_status "Token creation and distribution"

# Start monitoring service
echo "Starting monitoring service..."
npm run start-monitor
check_status "Monitoring service"

# Start trading service
echo "Starting trading service..."
npm run start-trading
check_status "Trading service"

# Start UI
echo "Starting dashboard..."
npm start &
check_status "Dashboard startup"

echo "🚀 Simulator is running!"
echo "Monitor the dashboard at http://localhost:3000" 