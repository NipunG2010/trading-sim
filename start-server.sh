#!/bin/bash

# Enable better error handling
set -e

echo "🚀 Starting Solana Trading Simulator Backend Server..."

# Create necessary directories
mkdir -p public

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "⚠️ Node modules not found. Installing dependencies..."
  npm install
fi

# Create necessary files if they don't exist
if [ ! -f "public/token-info.json" ]; then
  echo "📄 Creating placeholder token-info.json..."
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

# Test Solana connection
echo "🧪 Testing connection to Solana devnet..."
node -e "
const { Connection } = require('@solana/web3.js');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
connection.getVersion().then(version => {
  console.log('✅ Successfully connected to Solana devnet');
  console.log('Solana Version:', version);
}).catch(err => {
  console.error('❌ Failed to connect to Solana devnet:', err.message);
  process.exit(1);
});
"

# Start the backend server
echo "🚀 Starting backend server..."
node src/server.js 