/**
 * @typedef {import('express').Express} Express
 * @typedef {import('express').Request} Request 
 * @typedef {import('express').Response} Response
 * @typedef {import('@solana/web3.js').Connection} SolanaConnection
 */

// @ts-check
const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');
const secureConfig = require('./config/secureConfig');

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later'
});

const sensitiveApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // More strict limit for sensitive endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many sensitive requests, please try again later'
});

// Express app with proper types
/** @type {Express} */
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Apply rate limiting
app.use('/api', apiLimiter);
app.use('/api/accounts', sensitiveApiLimiter);
app.use('/api/create-token', sensitiveApiLimiter);

// Import routers
const { router: terminalRouter } = require('./server/routes/terminal.js');
app.use('/api', terminalRouter);

// Create Solana connection
/** @type {SolanaConnection} */
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// ... [rest of existing server.js code remains unchanged] ...

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});