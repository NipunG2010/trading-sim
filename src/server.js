/**
 * @typedef {import('express').Express} Express
 * @typedef {import('express').Request} Request 
 * @typedef {import('express').Response} Response
 * @typedef {import('@solana/web3.js').Connection} SolanaConnection
 */

// @ts-check
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Connection } = require('@solana/web3.js');
const secureConfig = require('./config/secureConfig');

// Express app with proper types
/** @type {Express} */
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import routers
const { router: terminalRouter } = require('./server/routes/terminal.js');
app.use('/api', terminalRouter);

// Create Solana connection
/** @type {SolanaConnection} */
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

/**
 * Run shell command with error handling
 * @param {string} command 
 * @returns {{success: boolean, output: string}}
 */
const runCommand = (command) => {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      output: error instanceof Error ? error.message : String(error) 
    };
  }
};

/**
 * @typedef {{
 *   privateKey: number[],
 *   publicKey: string,
 *   index: number,
 *   type: 'WHALE'|'RETAIL'
 * }} Account
 */

/**
 * Load accounts from secure storage
 * @returns {Account[]|null}
 */
const loadAccounts = () => {
  /** @type {Account[]} */
  const accounts = [];
  let index = 0;
  
  while (true) {
    const privateKey = secureConfig.get(`account_${index}_privateKey`);
    const publicKey = secureConfig.get(`account_${index}_publicKey`);
    
    if (!Array.isArray(privateKey) || typeof publicKey !== 'string') break;
    
    accounts.push({
      privateKey,
      publicKey,
      index,
      type: index < 25 ? 'WHALE' : 'RETAIL'
    });
    
    index++;
  }
  
  return accounts.length > 0 ? accounts : null;
};

/**
 * GET /api/accounts - Get all accounts (without private keys)
 * @param {Request} req
 * @param {Response} res
 * @returns {void}
 */
const getAccountsHandler = (req, res) => {
  const accounts = loadAccounts();
  if (!accounts) {
    res.status(404).json({ error: 'No accounts found' });
    return;
  }
  
  // Send sanitized accounts (without private keys)
  res.json(accounts.map(account => ({
    publicKey: account.publicKey,
    index: account.index,
    type: account.type
  })));
};

// Routes
app.get('/api/accounts', getAccountsHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});