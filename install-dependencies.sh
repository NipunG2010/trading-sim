#!/bin/bash

# Install dependencies for the Solana Token Trading Simulator

echo "Installing dependencies for Solana Token Trading Simulator..."

# Install Node.js dependencies
npm install

# Install TypeScript type definitions
npm install --save-dev @types/node @types/react @types/react-dom

# Install Solana dependencies
npm install @solana/web3.js @solana/spl-token

# Install chart.js and react-chartjs-2
npm install chart.js react-chartjs-2

# Install ts-node for running TypeScript scripts
npm install --save-dev ts-node

echo "Dependencies installed successfully!"
echo "You can now run the following commands:"
echo "  npm run create-accounts - Create 50 Solana wallets"
echo "  npm run test-accounts - Test the created wallets"
echo "  npm run fund-accounts - Print commands to fund the wallets"
echo "  npm run create-token - Create and distribute the token"
echo "  npm run run-trading - Run the default 48-hour trading sequence"
echo "  npm run run-pattern [pattern] [duration] [intensity] - Run a specific trading pattern"
echo "  npm start - Start the React UI dashboard" 