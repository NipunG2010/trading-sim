const express = require('express');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Connection } = require('@solana/web3.js');
const {
  movingAverageCrossover,
  fibonacciRetracement,
  bollingerBandSqueeze,
  volumePatternEngineering,
  organicActivitySimulation,
  macdCrossoverSignal,
  rsiDivergence,
  loadAccounts,
  loadTokenInfo
} = require('./trading-patterns.js');
const { terminalRouter } = require('./server/routes/terminal.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from public directory
app.use(express.static('public'));

// Mount the terminal router
app.use('/api', terminalRouter);

// Create Solana connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Helper to run commands
const runCommand = (command) => {
  try {
    console.log(`Running command: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`Command output: ${output}`);
    return { success: true, output };
  } catch (error) {
    console.error(`Error running command: ${command}`, error);
    return { success: false, output: error.message };
  }
};

// Helper to check if file exists and read it
const readAccountsFile = () => {
  try {
    if (fs.existsSync('accounts.json')) {
      const data = fs.readFileSync('accounts.json', { encoding: 'utf8' });
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading accounts file:', error);
    return null;
  }
};

// API endpoint to get accounts
app.get('/api/accounts', (req, res) => {
  try {
    const accountsPath = path.join(__dirname, 'accounts.json');
    if (!fs.existsSync(accountsPath)) {
      return res.status(404).json({ error: 'Accounts file not found. Please run create-accounts first.' });
    }

    const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
    
    // Add index to help determine account type
    const accounts = accountsData.map((account, index) => ({
      ...account,
      index,
      type: index < 25 ? 'WHALE' : 'RETAIL'
    }));

    res.json(accounts);
  } catch (error) {
    console.error('Error reading accounts:', error);
    res.status(500).json({ error: 'Failed to read accounts' });
  }
});

// API endpoint to get token transactions
app.get('/api/transactions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    // TODO: Implement actual transaction fetching
    const mockTransactions = Array(limit).fill(null).map((_, i) => ({
      id: `tx-${i}`,
      from: 'wallet1',
      to: 'wallet2',
      amount: Math.random() * 100,
      timestamp: Date.now() - i * 1000,
      type: Math.random() > 0.5 ? 'BUY' : 'SELL'
    }));
    res.json(mockTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// API endpoint to get trading status
app.get('/api/trading/status', (req, res) => {
  try {
    // TODO: Implement actual trading status
    res.json({
      isActive: true,
      currentPhase: 'TRADING',
      startTime: Date.now() - 3600000,
      endTime: Date.now() + 3600000
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trading status' });
  }
});

// Endpoint to create accounts
app.post('/api/create-accounts', (req, res) => {
  try {
    // Check if accounts already exist
    if (fs.existsSync('accounts.json')) {
      // Read the file to count accounts
      try {
        const data = fs.readFileSync('accounts.json', { encoding: 'utf8' });
        const accounts = JSON.parse(data);
        if (accounts && accounts.length > 0) {
          return res.json({ 
            success: true, 
            message: `Accounts already exist. Found ${accounts.length} accounts.`,
            output: `Accounts already exist. Found ${accounts.length} accounts.\nYou can use these existing accounts or delete the accounts.json file to create new ones.`
          });
        }
      } catch (readError) {
        console.error('Error reading accounts file:', readError);
      }
    }
    
    console.log('Creating new accounts...');
    const result = runCommand('node src/accounts.js');
    
    // Verify accounts were created
    if (result.success && fs.existsSync('accounts.json')) {
      try {
        const data = fs.readFileSync('accounts.json', { encoding: 'utf8' });
        const accounts = JSON.parse(data);
        if (accounts && accounts.length > 0) {
          result.output += `\nSuccessfully created ${accounts.length} accounts!`;
        }
      } catch (readError) {
        console.error('Error reading accounts file after creation:', readError);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in /api/create-accounts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to test accounts
app.post('/api/test-accounts', (req, res) => {
  try {
    const result = runCommand('node src/test-accounts.js');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to create source wallet
app.post('/api/create-source-wallet', (req, res) => {
  try {
    const result = runCommand('node src/create-source-wallet.js');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to distribute SOL
app.post('/api/distribute-sol', (req, res) => {
  try {
    // Check if source wallet exists
    if (!fs.existsSync('source-wallet.json')) {
      return res.status(400).json({
        success: false,
        message: 'Source wallet does not exist. Please create it first.'
      });
    }
    
    const { amount } = req.body;
    const solAmount = amount || 0.05;
    const result = runCommand(`node src/distribute-sol.js ./source-wallet.json ${solAmount}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to check token creation status
app.get('/api/token-status', (req, res) => {
  try {
    // Check if token-info.json exists in either location
    let tokenInfo = null;
    let tokenLocation = null;
    
    if (fs.existsSync('token-info.json')) {
      tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf-8'));
      tokenLocation = 'token-info.json';
    } else if (fs.existsSync('public/token-info.json')) {
      tokenInfo = JSON.parse(fs.readFileSync('public/token-info.json', 'utf-8'));
      tokenLocation = 'public/token-info.json';
    }
    
    if (tokenInfo) {
      // Validate token info
      const hasRealMint = tokenInfo.mint && 
                         !tokenInfo.mint.includes('DummyMintAddress') &&
                         tokenInfo.mint.length >= 32;
      
      return res.json({
        success: true,
        isCreated: hasRealMint,
        tokenInfo,
        tokenLocation,
        hasRealMint
      });
    }
    
    return res.json({
      success: true,
      isCreated: false,
      message: 'Token has not been created yet'
    });
  } catch (error) {
    console.error('Error in /api/token-status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to create and distribute token
app.post('/api/create-token', (req, res) => {
  try {
    console.log('Creating and distributing token...');
    
    // Check if token already exists with a real mint address
    if (fs.existsSync('token-info.json') || fs.existsSync('public/token-info.json')) {
      const tokenInfoPath = fs.existsSync('token-info.json') ? 'token-info.json' : 'public/token-info.json';
      try {
        const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));
        
        // Check if the mint is a real address and not a placeholder
        if (tokenInfo.mint && !tokenInfo.mint.includes('DummyMintAddress') && tokenInfo.mint.length >= 32) {
          return res.json({
            success: true,
            message: 'Token already exists with a real mint address',
            output: `Token already exists: ${tokenInfo.name} (${tokenInfo.symbol}) - Mint: ${tokenInfo.mint}`,
            tokenInfo
          });
        } else {
          console.log('Token info exists but has a dummy mint address. Will create a real token.');
        }
      } catch (readError) {
        console.error('Error reading existing token info:', readError);
      }
    }
    
    // Check if accounts exist first
    if (!fs.existsSync('accounts.json')) {
      return res.status(400).json({
        success: false,
        message: 'No accounts found. Please create accounts first.',
        output: 'Error: No accounts found. Please create accounts first by clicking "Create Accounts".'
      });
    }
    
    // Check if source wallet exists
    if (!fs.existsSync('source-wallet.json')) {
      return res.status(400).json({
        success: false,
        message: 'No source wallet found. Please create a source wallet first.',
        output: 'Error: No source wallet found. Please create a source wallet first by clicking "Create Source Wallet".'
      });
    }
    
    // Run token creation in a separate process to avoid blocking
    const child = exec('node src/create-real-token.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating token: ${error.message}`);
        // Don't send response here as it's already sent
      }
    });
    
    // Collect output
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
      console.log(`Token creation: ${data}`);
    });
    
    child.stderr.on('data', (data) => {
      output += `ERROR: ${data}`;
      console.error(`Token creation error: ${data}`);
    });
    
    // Send initial response immediately
    res.json({
      success: true,
      message: 'Token creation started. This may take a few minutes.',
      output: 'Token creation and distribution started. This process will run in the background and may take a few minutes to complete.\n\nYou can check the progress in the console output and refresh the UI when complete.'
    });
  } catch (error) {
    console.error('Error in /api/create-token:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Function to save transaction
const saveTransaction = (from, to, amount, type = 'transfer', pattern = null) => {
  try {
    // Create transactions file if it doesn't exist
    let transactions = [];
    if (fs.existsSync('transactions.json')) {
      transactions = JSON.parse(fs.readFileSync('transactions.json', 'utf-8'));
    }
    
    // Add new transaction
    const newTransaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      from,
      to,
      amount,
      type,
      pattern,
      timestamp: Date.now()
    };
    
    transactions.push(newTransaction);
    
    // Save back to file
    fs.writeFileSync('transactions.json', JSON.stringify(transactions, null, 2));
    
    return newTransaction;
  } catch (error) {
    console.error('Error saving transaction:', error);
    return null;
  }
};

// Load token info with proper error handling
const loadTokenInfoSafely = () => {
  try {
    if (fs.existsSync('token-info.json')) {
      return JSON.parse(fs.readFileSync('token-info.json', 'utf-8'));
    } else if (fs.existsSync('public/token-info.json')) {
      return JSON.parse(fs.readFileSync('public/token-info.json', 'utf-8'));
    } else {
      console.warn("⚠️ No token-info.json file found");
      return null;
    }
  } catch (error) {
    console.error("❌ Error loading token info:", error);
    return null;
  }
};

// Updated runAllPatterns function with proper error handling
const runAllPatterns = async () => {
  try {
    if (!fs.existsSync('accounts.json')) {
      throw new Error("Missing accounts.json file. Please create accounts first.");
    }
    
    console.log("Loading accounts...");
    const accounts = loadAccounts();
    console.log(`Loaded ${accounts.length} accounts`);
    
    // Safely load token info with fallback values if needed
    const tokenInfo = loadTokenInfoSafely();
    if (!tokenInfo || !tokenInfo.mint) {
      throw new Error("No valid token information found. Please create a token first.");
    }
    
    console.log(`Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`Mint: ${tokenInfo.mint}`);
    
    // Process accounts to assign types
    accounts.forEach((account, index) => {
      account.type = account.type || (index < Math.floor(accounts.length * 0.4) ? 'whale' : 'retail');
    });
    
    // Connection to Solana
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Set up trading patterns
    const patterns = [
      {
        name: "Moving Average Crossover",
        fn: movingAverageCrossover,
        options: {
          durationMinutes: 5, // Reduced for testing
          tradeIntervalSeconds: 3, // Faster for testing
          volumeMultiplier: 2.0,
          whaleParticipation: 0.3
        },
        processTrade: (sender, receiver, amount) => {
          // Save transaction
          saveTransaction(
            sender.publicKey,
            receiver.publicKey,
            amount,
            'ma_crossover',
            'moving_average'
          );
        }
      },
      {
        name: "Fibonacci Retracement",
        fn: fibonacciRetracement,
        options: {
          durationMinutes: 5,
          tradeIntervalSeconds: 3,
          volumeMultiplier: 1.5,
          whaleParticipation: 0.4
        },
        processTrade: (sender, receiver, amount) => {
          // Save transaction
          saveTransaction(
            sender.publicKey,
            receiver.publicKey,
            amount,
            'fibonacci',
            'fibonacci'
          );
        }
      },
      {
        name: "Bollinger Band Squeeze",
        fn: bollingerBandSqueeze,
        options: {
          durationMinutes: 5,
          tradeIntervalSeconds: 3,
          volumeMultiplier: 3.0,
          whaleParticipation: 0.6
        },
        processTrade: (sender, receiver, amount) => {
          // Save transaction
          saveTransaction(
            sender.publicKey,
            receiver.publicKey,
            amount,
            'bollinger',
            'bollinger'
          );
        }
      },
      {
        name: "Volume Pattern Engineering",
        fn: volumePatternEngineering,
        options: {
          durationMinutes: 5,
          tradeIntervalSeconds: 3,
          volumeMultiplier: 2.5,
          whaleParticipation: 0.5
        },
        processTrade: (sender, receiver, amount) => {
          // Save transaction
          saveTransaction(
            sender.publicKey,
            receiver.publicKey,
            amount,
            'volume',
            'volume_pattern'
          );
        }
      }
    ];
    
    // Run each pattern sequentially
    console.log("\n🚀 Starting Trading Pattern Sequence");
    tradingStatus = 'running';
    
    for (const pattern of patterns) {
      currentPattern = pattern.name;
      patternStartTime = Date.now();
      patternDuration = pattern.options.durationMinutes * 60 * 1000;
      patternEndTime = patternStartTime + patternDuration;
      
      console.log(`\n📊 Running pattern: ${pattern.name}`);
      
      // Create a wrapper for the pattern that saves transactions
      const patternWithTracking = async (connection, accounts, tokenInfo, options) => {
        if (!tokenInfo || !tokenInfo.mint) {
          throw new Error("Cannot execute pattern: No valid token information available");
        }
        
        // Create a mock transferTokens function that saves transactions
        const originalTransferTokens = pattern.fn;
        pattern.fn = async (connection, accounts, tokenInfo, options) => {
          // Run the pattern
          const result = await originalTransferTokens(connection, accounts, tokenInfo, options);
          
          // Save transactions
          if (pattern.processTrade) {
            // This would happen for each trade in the real implementation
            // Here we're just simulating
            const whaleAccounts = accounts.filter(a => a.type === 'whale');
            const retailAccounts = accounts.filter(a => a.type === 'retail');
            
            // Generate some sample transactions
            for (let i = 0; i < 5; i++) {
              const isWhaleTrade = Math.random() < options.whaleParticipation;
              
              let sender, receiver;
              if (isWhaleTrade && whaleAccounts.length > 0) {
                sender = whaleAccounts[Math.floor(Math.random() * whaleAccounts.length)];
                receiver = retailAccounts[Math.floor(Math.random() * retailAccounts.length)];
              } else if (retailAccounts.length > 1) {
                sender = retailAccounts[Math.floor(Math.random() * retailAccounts.length)];
                do {
                  receiver = retailAccounts[Math.floor(Math.random() * retailAccounts.length)];
                } while (sender === receiver);
              } else {
                continue; // Skip if not enough accounts
              }
              
              // Generate random amount
              const amount = isWhaleTrade 
                ? Math.floor(Math.random() * 50000) + 10000
                : Math.floor(Math.random() * 5000) + 1000;
              
              pattern.processTrade(sender, receiver, amount);
            }
          }
          
          return result;
        };
        
        // Call the pattern function
        return await pattern.fn(connection, accounts, tokenInfo, options);
      };
      
      await patternWithTracking(connection, accounts, tokenInfo, pattern.options);
      
      // Pause between patterns
      if (patterns.indexOf(pattern) < patterns.length - 1) {
        console.log(`\nPausing for 1 second before next pattern...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    tradingStatus = 'idle';
    currentPattern = null;
    patternStartTime = null;
    patternEndTime = null;
    
    console.log("\n✅ All trading patterns completed successfully!");
    return { success: true, message: "All trading patterns executed successfully" };
  } catch (error) {
    console.error("Error running patterns:", error);
    
    // Reset trading status on error
    tradingStatus = 'error';
    currentPattern = null;
    patternStartTime = null;
    patternEndTime = null;
    
    throw error;
  }
};

// Flag to track if patterns are currently running
let patternsRunning = false;

// Endpoint to run trading patterns
app.post('/api/run-trading', async (req, res) => {
  if (patternsRunning) {
    return res.status(400).json({
      success: false,
      message: 'Trading patterns are already running.'
    });
  }
  
  try {
    patternsRunning = true;
    
    // Run patterns in the background and immediately return
    res.json({ success: true, message: 'Trading patterns started running in background' });
    
    // Execute patterns
    await runAllPatterns();
    
    patternsRunning = false;
  } catch (error) {
    patternsRunning = false;
    console.error("Error in /api/run-trading:", error);
  }
});

// Endpoint to check if patterns are running
app.get('/api/trading-status', (req, res) => {
  try {
    res.json({
      success: true,
      isRunning: patternsRunning
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to stop trading patterns
app.post('/api/stop-trading', (req, res) => {
  patternsRunning = false;
  res.json({ success: true, message: 'Trading patterns will stop after current pattern completes' });
});

// Endpoint to run a specific pattern
app.post('/api/run-pattern', async (req, res) => {
  if (patternsRunning) {
    return res.status(400).json({
      success: false,
      message: 'Trading patterns are already running.'
    });
  }
  
  try {
    const { pattern, duration, intensity } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'Pattern type is required'
      });
    }
    
    // Set up command
    const command = `node src/run-trading.js --pattern=${pattern} --duration=${duration || 10} --intensity=${intensity || 5}`;
    patternsRunning = true;
    
    // Execute in background and return immediately
    res.json({ success: true, message: `Started running ${pattern} pattern` });
    
    exec(command, (error, stdout, stderr) => {
      console.log(stdout);
      if (stderr) console.error(stderr);
      if (error) console.error(`Error executing command: ${error}`);
      patternsRunning = false;
    });
  } catch (error) {
    patternsRunning = false;
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to check if accounts exist
app.get('/api/check-accounts', (req, res) => {
  try {
    if (fs.existsSync('accounts.json')) {
      const data = fs.readFileSync('accounts.json', { encoding: 'utf8' });
      const accounts = JSON.parse(data);
      res.json({
        success: true,
        exists: true,
        count: accounts.length
      });
    } else {
      res.json({
        success: true,
        exists: false,
        count: 0
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/`);
}); 