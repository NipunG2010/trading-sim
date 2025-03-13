#!/bin/bash

# Enable better error handling
set -e

echo "🚀 Starting Solana Trading Simulator..."

# Create necessary directories if they don't exist
mkdir -p public

# Create token-info.json only if it doesn't exist
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
  echo "✅ Using existing token-info.json file."
fi

# Create .env file with correct proxy settings
echo "📄 Creating .env file with API proxy settings..."
cat > .env << EOL
GENERATE_SOURCEMAP=false
SKIP_PREFLIGHT_CHECK=true
BROWSER=none
PORT=3000
REACT_APP_API_URL=http://localhost:3001
EOL
echo "✅ Environment file created successfully!"

# Verify account files (but don't regenerate if they exist)
if [ -f accounts.json ]; then
  echo "✅ Using existing accounts.json (50 accounts)"
  # Optional: Validate account format without changing
  #node src/test-accounts-format.js
else
  echo "⚠️ accounts.json not found. You will need to create accounts from the Admin tab."
fi

# Check if source wallet exists
if [ -f "source-wallet.json" ]; then
  echo "✅ Using existing source wallet from source-wallet.json"
else
  echo "⚠️ No source wallet found. You will need to create one via the Admin tab."
fi

# Check token info for real mint address
if grep -q "DummyMintAddress" public/token-info.json; then
  echo "⚠️ Token info contains a placeholder mint address. Use the Admin tab to create a real token."
else
  echo "✅ Token info seems to have a real mint address."
fi

# Print usage instructions
echo ""
echo "---------------------------------------------------------"
echo "🌟 Solana Trading Simulator 🌟"
echo ""
echo "1. Once the app is running, use the Admin tab to:"
echo "   - Create source wallet (if needed)"
echo "   - Fund the source wallet with SOL"
echo "   - Create and distribute real token"
echo ""
echo "2. If you encounter API errors:"
echo "   - Make sure both frontend and backend are running"
echo "   - The frontend should connect to http://localhost:3001"
echo ""
echo "Starting servers..."
echo "---------------------------------------------------------"
echo ""

# Start the backend server in the background
echo "🚀 Starting backend server on port 3001..."
node src/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend server to start..."

# Start the frontend server
echo "🚀 Starting frontend server on port 3000..."
# Use HTTPS=false to avoid additional certificate issues
HTTPS=false npm run start

# When npm start exits, kill the backend server
echo "🛑 Shutting down backend server..."
kill $BACKEND_PID 