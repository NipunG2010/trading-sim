const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { router: terminalRouter } = require('./routes/terminal');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cache control middleware
const cacheControl = (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=30'); // Cache for 30 seconds
  next();
};

// API routes first
app.use('/api', cacheControl);

// API routes
app.use('/api/terminal', terminalRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get accounts endpoint
app.get('/api/accounts', async (req, res) => {
  try {
    const accountsPath = path.join(__dirname, '../../accounts.json');
    const accounts = await fs.readFile(accountsPath, 'utf-8');
    res.json(JSON.parse(accounts));
  } catch (error) {
    console.error('Error reading accounts:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Accounts file not found. Please create accounts first.' });
    } else {
      res.status(500).json({ error: 'Failed to read accounts' });
    }
  }
});

// Get token info endpoint
app.get('/api/token-info', async (req, res) => {
  try {
    const tokenInfoPath = path.join(__dirname, '../../token-info.json');
    const tokenInfo = await fs.readFile(tokenInfoPath, 'utf-8');
    res.json(JSON.parse(tokenInfo));
  } catch (error) {
    console.error('Error reading token info:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Token info file not found' });
    } else {
      res.status(500).json({ error: 'Failed to read token info' });
    }
  }
});

// Create token endpoint
app.post('/api/create-token', async (req, res) => {
  try {
    const { mintAddress } = req.body;
    if (!mintAddress) {
      return res.status(400).json({ error: 'Mint address is required' });
    }

    const tokenInfo = {
      mint: mintAddress,
      name: "SolTrader Token",
      symbol: "STRD",
      decimals: 9,
      totalSupply: 1000000000
    };

    const tokenInfoPath = path.join(__dirname, '../../token-info.json');
    await fs.writeFile(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));

    res.json({ success: true, tokenInfo });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'connected' });
});

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../../build'), {
  index: false, // Don't serve index.html for all routes
  maxAge: '30s' // Cache static files for 30 seconds
}));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Frontend URL: http://localhost:3000`);
  console.log(`Backend URL: http://localhost:${port}`);
}); 