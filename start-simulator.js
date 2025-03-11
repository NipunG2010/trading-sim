// Solana Trading Simulator Startup Script
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const net = require('net');

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Output functions with color formatting
function log(message) {
  console.log(message);
}

function success(message) {
  console.log(`${colors.green}${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.blue}${message}${colors.reset}`);
}

// Header
console.log(`${colors.blue}==========================================================${colors.reset}`);
console.log(`${colors.blue}       SOLANA TRADING SIMULATOR - JAVASCRIPT STARTER      ${colors.reset}`);
console.log(`${colors.blue}==========================================================${colors.reset}`);

// Helper functions
function commandExists(command) {
  try {
    execSync(process.platform === 'win32' ? 
      `where ${command}` : 
      `which ${command}`, 
      { stdio: 'ignore' }
    );
    return true;
  } catch (e) {
    return false;
  }
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
      server.close();
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

function runCommand(command, options = {}) {
  try {
    log(`Running: ${command}`);
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (e) {
    if (options.ignoreError) {
      warning(`Command failed but continuing: ${e.message}`);
      return '';
    }
    error(`Command failed: ${e.message}`);
    throw e;
  }
}

// Main function to run the startup sequence
async function main() {
  try {
    // Check for Solana CLI
    if (!commandExists('solana')) {
      error('Solana CLI not found. Please install it first:');
      warning('Visit: https://docs.solanalabs.com/cli/install');
      process.exit(1);
    }

    // Check Solana configuration
    const solanaConfig = runCommand('solana config get', { silent: true });
    const isDevnet = solanaConfig.includes('devnet');
    
    if (!isDevnet) {
      warning('Solana is not configured for devnet. Setting up devnet configuration...');
      runCommand('solana config set --url https://api.devnet.solana.com');
      success('Solana configured for devnet!');
    } else {
      success('Solana already configured for devnet!');
    }

    // Create necessary directories
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }

    log('📋 Checking project setup...');

    // Determine what needs to be done
    const needsAccounts = !fs.existsSync('accounts.json');
    const needsSourceWallet = !fs.existsSync('source-wallet.json');
    const needsTokenCreation = !fs.existsSync('public/token-info.json') || 
      (fs.existsSync('public/token-info.json') && 
       fs.readFileSync('public/token-info.json', 'utf8').includes('DummyMintAddressReplace'));
    
    let needsSolDistribution = needsAccounts || needsSourceWallet;

    // Create accounts if needed
    if (needsAccounts) {
      warning('Creating Solana accounts...');
      runCommand('npm run create-accounts-js');
      success('Accounts created successfully!');
    } else {
      success('Using existing accounts.');
    }

    // Create source wallet if needed
    if (needsSourceWallet) {
      warning('Creating source wallet...');
      runCommand('npm run create-source-wallet');
      success('Source wallet created successfully!');
      needsSolDistribution = true;
    } else {
      success('Using existing source wallet.');
    }

    // Verify accounts
    warning('Verifying accounts...');
    runCommand('npm run test-accounts-js');
    success('Accounts verified successfully!');

    // Fund source wallet
    if (needsSolDistribution) {
      warning('Funding source wallet...');
      
      let sourceWalletPubKey = '';
      if (fs.existsSync('source-wallet.json')) {
        const sourceWalletRaw = fs.readFileSync('source-wallet.json', 'utf8');
        
        if (sourceWalletRaw.includes('publicKey')) {
          // New format with publicKey field
          try {
            const wallet = require('./source-wallet.json');
            sourceWalletPubKey = Array.isArray(wallet) ? wallet[0].publicKey : wallet.publicKey;
          } catch (e) {
            error(`Error parsing source wallet: ${e.message}`);
          }
        } else {
          // Old format with just keypair array
          try {
            const { Keypair } = require('@solana/web3.js');
            const wallet = require('./source-wallet.json');
            const keypair = Array.isArray(wallet) ? wallet : JSON.parse(wallet);
            const pair = Keypair.fromSecretKey(Uint8Array.from(keypair));
            sourceWalletPubKey = pair.publicKey.toString();
          } catch (e) {
            error(`Error creating keypair from source wallet: ${e.message}`);
          }
        }
      }
      
      if (sourceWalletPubKey) {
        warning(`Requesting airdrop for source wallet (${sourceWalletPubKey})...`);
        runCommand(`solana airdrop 2 ${sourceWalletPubKey} --url https://api.devnet.solana.com`, { ignoreError: true });
        
        warning('Checking source wallet balance...');
        const balanceOutput = runCommand(`solana balance ${sourceWalletPubKey} --url https://api.devnet.solana.com`, { silent: true });
        const balance = parseFloat(balanceOutput.trim().split(' ')[0]);
        
        success(`Current balance: ${balance} SOL`);
        
        // Try to get enough SOL for operations
        let attempt = 1;
        const maxAttempts = 3;
        
        while (balance < 0.5 && attempt <= maxAttempts) {
          warning(`Source wallet balance is low. Requesting another airdrop (attempt ${attempt})...`);
          runCommand(`solana airdrop 2 ${sourceWalletPubKey} --url https://api.devnet.solana.com`, { ignoreError: true });
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempt++;
        }
      } else {
        error('Could not determine source wallet public key. Please fund it manually.');
        process.exit(1);
      }
    }

    // Distribute SOL to accounts if needed
    if (needsSolDistribution) {
      warning('Distributing SOL to all accounts...');
      try {
        runCommand('npm run distribute-sol -- ./source-wallet.json 0.05');
      } catch (e) {
        warning('Failed to distribute SOL to accounts. This might be due to rate limiting. Waiting 5 seconds and trying again...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        runCommand('npm run distribute-sol -- ./source-wallet.json 0.05');
      }
      success('SOL distributed successfully!');
    }

    // Create and distribute token if needed
    if (needsTokenCreation) {
      warning('Creating and distributing a new token on Solana devnet...');
      warning('This may take some time. Please be patient.');
      
      if (fs.existsSync('create-real-token.js')) {
        warning('Running token creation script...');
        runCommand('node create-real-token.js');
      } else {
        warning('Creating temporary token creation script...');
        
        // Create token creation script content
        const tokenScriptContent = `
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from "@solana/spl-token";
import * as fs from "fs";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function main() {
  try {
    console.log("✅ Loading source wallet...");
    const sourceWalletData = JSON.parse(fs.readFileSync('source-wallet.json', 'utf8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(sourceWalletData));
    
    console.log("✅ Generating token metadata...");
    const prefixes = ["Luna", "Solar", "Cosmic", "Quantum", "Nexus"];
    const suffixes = ["Coin", "Token", "Cash", "Pay", "DAO"];
    const name = \`\${prefixes[Math.floor(Math.random() * prefixes.length)]} \${suffixes[Math.floor(Math.random() * suffixes.length)]}\`;
    const symbol = name.split(' ').map(word => word[0]).join('') + Math.floor(Math.random() * 100);
    const decimals = Math.floor(Math.random() * 4) + 6; // 6-9 decimals
    
    console.log(\`✅ Creating token: \${name} (\${symbol}) with \${decimals} decimals\`);
    
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      decimals
    );
    
    console.log(\`✅ Token created successfully! Mint address: \${mint.toString()}\`);
    
    const totalSupply = 1_000_000_000;
    const totalSupplyWithDecimals = totalSupply * Math.pow(10, decimals);
    
    console.log(\`✅ Creating token account for source wallet...\`);
    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );
    
    console.log(\`✅ Minting \${totalSupply.toLocaleString()} tokens to source wallet...\`);
    await mintTo(
      connection,
      payer,
      mint,
      payerTokenAccount.address,
      payer,
      totalSupplyWithDecimals
    );
    
    // Save token info
    const tokenInfo = {
      mint: mint.toString(),
      name,
      symbol,
      decimals,
      totalSupply
    };
    
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    
    fs.writeFileSync('public/token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log(\`✅ Token info saved to public/token-info.json\`);
    
    if (!fs.existsSync('accounts.json')) {
      console.log(\`❌ accounts.json not found. Skipping token distribution.\`);
      return;
    }
    
    console.log(\`✅ Distributing tokens to accounts...\`);
    const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    const batchSize = 10;
    let successCount = 0;
    
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);
      
      console.log(\`✅ Processing batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(accounts.length/batchSize)}...\`);
      
      const promises = batch.map(async (account) => {
        try {
          const allocation = Math.floor(Math.random() * totalSupply * 0.02) + 1000; // Random amount up to 2% of supply
          const recipientKeypair = Keypair.fromSecretKey(new Uint8Array(account.secretKey));
          
          const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            recipientKeypair.publicKey
          );
          
          await transfer(
            connection,
            payer,
            payerTokenAccount.address,
            recipientTokenAccount.address,
            payer,
            allocation * Math.pow(10, decimals)
          );
          
          successCount++;
          console.log(\`✅ Transferred \${allocation.toLocaleString()} tokens to \${recipientKeypair.publicKey.toString()}\`);
          return true;
        } catch (error) {
          console.error(\`❌ Failed to transfer to account: \${error.message}\`);
          return false;
        }
      });
      
      await Promise.all(promises);
      
      // Short delay between batches
      if (i + batchSize < accounts.length) {
        console.log(\`⏱️ Waiting briefly before next batch...\`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(\`✅ Token distribution complete! \${successCount}/\${accounts.length} transfers succeeded.\`);
    
  } catch (error) {
    console.error(\`❌ Error creating token:\`, error);
    process.exit(1);
  }
}

main();`;

        // Write to temporary file and execute
        fs.writeFileSync('temp-token-creator.js', tokenScriptContent);
        warning('Running temporary token creation script...');
        runCommand('node temp-token-creator.js');
        fs.unlinkSync('temp-token-creator.js');
      }
      
      success('Token created and distributed successfully!');
    } else {
      success('Token already exists. Using existing token.');
    }

    // Start the application
    warning('Starting the Solana Trading Simulator application...');

    // Start backend server
    warning('Starting backend server...');
    const serverProcess = spawn('node', ['src/server.js'], {
      stdio: 'inherit',
      detached: false
    });
    
    // Set up server termination on script exit
    const cleanupServer = () => {
      if (serverProcess && !serverProcess.killed) {
        warning('Shutting down server...');
        serverProcess.kill();
      }
    };
    
    process.on('exit', cleanupServer);
    process.on('SIGINT', () => {
      cleanupServer();
      process.exit();
    });
    process.on('SIGTERM', () => {
      cleanupServer();
      process.exit();
    });

    // Wait for backend server to start
    warning('Waiting for backend server to start...');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      const portInUse = await isPortInUse(3001);
      if (portInUse) {
        success('Backend server started successfully!');
        break;
      }
      attempts++;
      warning(`Waiting for server to start (attempt ${attempts}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (attempts === maxAttempts) {
      error('Failed to start backend server after 30 attempts.');
      error('Please check for errors in the server logs.');
      cleanupServer();
      process.exit(1);
    }

    // Start React frontend
    success('Starting React frontend application...');
    info('=========================================================');
    info('             Trading Simulator is starting                ');
    info('=========================================================');
    success('Use the UI to:');
    success('- Monitor token trading activity');
    success('- View account balances and transactions');
    success('- Run trading patterns from the admin tab');
    info('=========================================================');

    // Start the frontend
    runCommand('npm start');

  } catch (err) {
    error(`Error occurred: ${err.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  error(`Unhandled error: ${err.message}`);
  process.exit(1);
}); 