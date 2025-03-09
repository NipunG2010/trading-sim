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
BROWSER=none
EOL

# Start the development server
echo "Starting development server..."
npm start 