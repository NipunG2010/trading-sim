#!/bin/bash

# Create necessary files if they don't exist
if [ ! -f "public/token-info.json" ]; then
  echo "Creating token-info.json..."
  cat > public/token-info.json << EOL
{
  "mint": "DummyMintAddressReplace1111111111111111111111111",
  "name": "SolTrader Token",
  "symbol": "STRD",
  "decimals": 9,
  "totalSupply": 1000000000
}
EOL
fi

# Create .env file
echo "Creating .env file..."
cat > .env << EOL
GENERATE_SOURCEMAP=false
SKIP_PREFLIGHT_CHECK=true
EOL

# Check for and fix TypeScript issues
echo "Checking for TypeScript issues..."
npx tsc --noEmit

# Install any missing dependencies
echo "Checking for missing dependencies..."
npm install --no-audit --no-fund

# Start the development server
echo "Starting development server..."
npm start 