const { Router } = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');

const router = Router();
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

router.post('/execute-command', async (req, res) => {
  try {
    const { command } = req.body;
    
    // Validate command
    const validatedCommand = validateCommand(command);
    
    // Add timeout to prevent hanging
    const timeoutMs = 30000; // 30 seconds
    const { stdout, stderr } = await Promise.race([
      execPromise(validatedCommand),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Command timed out')), timeoutMs)
      )
    ]);
    
    // Send both stdout and stderr
    res.json({
      success: true,
      output: stdout,
      error: stderr
    });
  } catch (error) {
    console.error('Terminal command error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'An error occurred while executing the command'
    });
  }
});

module.exports = {
  router,
  SOLANA_COMMANDS
}; 