const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Predefined Solana commands
const SOLANA_COMMANDS = {
  CREATE_ACCOUNT: 'solana-keygen grind --starts-with dad:1',
  SET_KEYPAIR: (keypair) => `solana config set --keypair ${keypair}`,
  SET_DEVNET: 'solana config set --url devnet',
  GET_CONFIG: 'solana config get',
  GET_BALANCE: 'solana balance',
  CREATE_MINT: 'solana-keygen grind --starts-with mnt:1',
  CREATE_TOKEN: (mintAddress) => 
    `spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --enable-metadata --decimals 9 ${mintAddress}`,
  CREATE_TOKEN_ACCOUNT: (tokenAddress) => 
    `spl-token create-account ${tokenAddress}`,
  MINT_TOKENS: (tokenAddress, amount) => 
    `spl-token mint ${tokenAddress} ${amount}`,
  DISABLE_MINT: (tokenAddress) => 
    `spl-token authorize ${tokenAddress} mint --disable`,
  DISABLE_FREEZE: (tokenAddress) => 
    `spl-token authorize ${tokenAddress} freeze --disable`,
};

// Add input validation helper
const validateCommand = (command) => {
  // Basic security checks
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command format');
  }
  
  // Prevent command injection
  if (command.includes('&&') || command.includes('||') || command.includes(';')) {
    throw new Error('Invalid command characters detected');
  }
  
  // Only allow Solana CLI commands
  const allowedCommands = [
    'solana-keygen',
    'solana',
    'spl-token'
  ];
  
  const isAllowed = allowedCommands.some(cmd => command.startsWith(cmd));
  if (!isAllowed) {
    throw new Error('Only Solana CLI commands are allowed');
  }
  
  return command;
};

// Terminal command execution endpoint
router.post('/execute', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // For now, just echo the command
    res.json({ 
      success: true, 
      output: `Received command: ${command}`,
      command
    });
  } catch (error) {
    console.error('Terminal execution error:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

// Terminal status endpoint
router.get('/status', (req, res) => {
  res.json({ status: 'ready' });
});

module.exports = { router, SOLANA_COMMANDS }; 