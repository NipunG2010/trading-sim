#!/bin/bash

# Enable better error handling
set -e

echo "🚀 Starting Solana Trading Simulator..."

# Create necessary directories
mkdir -p public

# Create necessary files if they don't exist
if [ ! -f "public/token-info.json" ]; then
  echo "📄 Creating token-info.json..."
  cat > public/token-info.json << EOL
{
  "mint": "DummyMintAddressReplace1111111111111111111111111",
  "name": "SolTrader Token",
  "symbol": "STRD",
  "decimals": 9,
  "totalSupply": 1000000000
}
EOL
  echo "✅ Token info file created successfully!"
else
  echo "✅ Token info file already exists."
fi

# Create .env file
echo "📄 Creating .env file..."
cat > .env << EOL
GENERATE_SOURCEMAP=false
SKIP_PREFLIGHT_CHECK=true
BROWSER=none
PORT=3000
REACT_APP_API_URL=http://localhost:3001
EOL
echo "✅ Environment file created successfully!"

# Install required packages
if [ ! -d "node_modules/express" ] || [ ! -d "node_modules/cors" ]; then
  echo "📦 Installing required packages..."
  npm install express cors
  echo "✅ Required packages installed successfully!"
else
  echo "✅ Required packages already installed."
fi

# Check if accounts.json exists
if [ -f accounts.json ]; then
  echo "✅ Found accounts.json"
  
  # Verify and fix account formats if needed
  echo "🧪 Validating account formats..."
  npm run test-accounts-format
else
  echo "⚠️ accounts.json not found. Please create accounts with 'npm run create-accounts-js'"
fi

# Check if source wallet exists
if [ -f "source-wallet.json" ]; then
  echo "✅ Source wallet found in source-wallet.json"
else
  echo "⚠️ No source wallet found. You will need to create one via the UI."
fi

# Check if token-info.json exists
if [ -f "public/token-info.json" ]; then
  echo "✅ Found token-info.json"
  
  # Run token distribution test
  echo "🧪 Testing token distribution..."
  npm run test-token-distribution
else
  echo "⚠️ No token has been created yet. Use the Admin tab to create a token."
fi

# Start the backend server in a separate process
echo "🚀 Starting backend server..."
node src/server.js &
BACKEND_PID=$!

# Check if backend is running immediately (no sleep)
echo "⏳ Checking if backend server is running..."
# Use netstat to check if port 3001 is listening
if command -v netstat &> /dev/null; then
  ATTEMPTS=0
  MAX_ATTEMPTS=10
  while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if netstat -tuln | grep -q ":3001 "; then
      echo "✅ Backend server running on http://localhost:3001"
      break
    fi
    ATTEMPTS=$((ATTEMPTS+1))
    echo "Waiting for backend to start... ($ATTEMPTS/$MAX_ATTEMPTS)"
    sleep 0.2 # Very short delay
  done
  
  if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    echo "⚠️ Backend server may not have started properly, but continuing anyway..."
  fi
else
  # If netstat is not available, just wait a very short time
  sleep 0.5
  echo "✅ Backend server started (port check not available)"
fi

# Print usage instructions
echo "
---------------------------------------------------------
🌟 Solana Trading Simulator 🌟

1. Use the Admin tab to:
   - Create 50 Solana accounts
   - Create a source wallet
   - Fund the source wallet with SOL
   - Distribute SOL to all accounts
   - Create and distribute tokens

2. Then use the Patterns tab to run trading strategies

Visit http://localhost:3000 to access the dashboard.
---------------------------------------------------------
"

# Start the frontend development server
echo "🚀 Starting frontend development server..."
npm start

# When npm start exits, kill the backend server
echo "🛑 Shutting down backend server..."
kill $BACKEND_PID 