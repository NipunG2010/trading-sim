// @ts-check
const express = require('express');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Connection } = require('@solana/web3.js');

// Import secureConfig instance
const { secureConfig } = require('./config/secureConfig');

// Import trading patterns as namespace
const tradingPatterns = require('./trading-patterns.js');

// Import terminal router
const { router: terminalRouter } = require('./server/routes/terminal.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api', terminalRouter);

// Create Solana connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Run command helper
/**
 * @param {string} command
 */
const runCommand = (command) => {
  try {
    console.log(`Running command: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`Command output: ${output}`);
    return { success: true, output };
  } catch (error) {
    console.error(`Error running command: ${command}`, error);
    return { 
      success: false, 
      output: error instanceof Error ? error.message : String(error) 
    };
  }
};

// Load accounts from secure storage
const loadAccounts = () => {
  try {
    const accounts = [];
    let index = 0;
    
    while (true) {
      const privateKey = secureConfig.get(`account_${index}_privateKey`);
      const publicKey = secureConfig.get(`account_${index}_publicKey`);
      
      if (!privateKey || !publicKey) break;
      
      accounts.push({
        privateKey,
        publicKey,
        index,
        type: index < 25 ? 'WHALE' : 'RETAIL'
      });
      
      index++;
    }
    
    return accounts.length > 0 ? accounts : null;
  } catch (error) {
    console.error('Error loading accounts:', error);
    return null;
  }
};

// API endpoint to get accounts
app.get('/api/accounts', (req, res) => {
  const accounts = loadAccounts();
  if (!accounts) {
    return res.status(404).json({ error: 'No accounts found in secure storage' });
  }
  
  // Return sanitized accounts (without private keys)
  res.json(accounts.map(account => ({
    publicKey: account.publicKey,
    index: account.index,
    type: account.type
  })));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});