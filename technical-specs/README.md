# Solana Token Trading Simulator

A comprehensive trading simulator for Solana tokens with advanced pattern implementation, trading analysis, and bot detection capabilities.

## Overview

This project implements a realistic trading simulator for Solana tokens, complete with:

- Automatic wallet creation and management
- Token creation and distribution
- Advanced trading patterns based on technical analysis
- Bot-detection honeypots
- Real-time monitoring interface
- Complete API for program control

The simulator creates realistic trading patterns to attract automated trading bots, then leverages their behaviors for profit.

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm (v7+)
- Solana CLI (for wallet funding)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the application (frontend + backend):

```bash
./start-app.sh
```

This will:
- Create necessary configuration files
- Install required packages
- Start the backend server on port 3001
- Start the frontend server on port 3000
- Open the web interface in your browser

## Usage Guide

### 1. Create Accounts

Create 50 Solana wallets with the "Create Accounts" button in the Admin tab. These will be stored in `accounts.json`.

### 2. Create Source Wallet

Generate a source wallet with the "Create Source Wallet" button. This will be stored in `source-wallet.json`.

### 3. Fund Source Wallet

Fund your source wallet with SOL from Solana devnet:

```bash
solana airdrop 2 <SOURCE_WALLET_PUBLIC_KEY> --url https://api.devnet.solana.com
```

Replace `<SOURCE_WALLET_PUBLIC_KEY>` with the public key from `source-wallet.json`.

### 4. Distribute SOL

Distribute SOL from your source wallet to all generated accounts:

```bash
# In the Admin terminal
distribute-sol 0.05
```

This will send 0.05 SOL to each of the 50 accounts.

### 5. Create Token

Create a new SPL token and distribute it among your accounts:

```bash
# In the Admin terminal
create-token
```

This creates a token with 1 billion supply and distributes it among the accounts with a realistic distribution (60% to whales, 40% to retail).

### 6. Run Trading Strategies

You can run all trading strategies in sequence:

```bash
# In the Admin terminal
run-trading
```

Or run a specific strategy with custom duration and intensity:

```bash
# In the Admin terminal
run-pattern moving_average 20 7
```

Format: `run-pattern <pattern_type> <duration_minutes> <intensity>`

Available patterns:
- `moving_average`: Moving Average Crossover
- `fibonacci`: Fibonacci Retracement
- `bollinger`: Bollinger Band Squeeze
- `volume_pattern`: Volume Pattern Engineering
- `organic`: Organic Activity Simulation
- `macd`: MACD Crossover Signal
- `rsi`: RSI Divergence

### 7. Monitor Results

Use the dashboard tabs to monitor:
- **Overview**: Price chart and key metrics
- **Transactions**: Detailed transaction history
- **Accounts**: Account balances and activities
- **Patterns**: Configure and run trading patterns
- **Admin**: Execute commands and view system output

## Architecture

- **Frontend**: React with TypeScript
- **Backend**: Express server with Solana integration
- **Trading Patterns**: Advanced algorithms for simulating realistic market behavior
- **Wallet Management**: Secure handling of Solana wallets and transactions
- **Token Handling**: SPL token creation and distribution

## Performance Optimizations

This simulator has been optimized for performance with the following enhancements:

### Token Creation and Distribution
- **Optimized Batch Processing**: Uses larger batch sizes (10 accounts per batch) to process token distributions faster
- **Reduced Delay**: Minimal delays (100ms) between batches while avoiding rate limiting
- **Retry Logic**: Automatic retry with exponential backoff for failed token transfers
- **Pre-calculation**: Pre-calculates token decimals to avoid repeated network calls
- **Account Caching**: Caches token accounts to avoid redundant lookups

### Trading Patterns
- **Transaction Reliability**: Implements retry logic in trading transactions
- **Error Handling**: Comprehensive error handling with detailed logging
- **Optimized Confirmation**: Efficient transaction confirmation workflow

### Application Startup
- **Fast Initialization**: Eliminated unnecessary delays during application startup
- **Efficient Server Checking**: Smart detection of backend server availability
- **Progress Reporting**: Detailed progress indicators during initialization

### User Interface
- **Real-time Feedback**: Immediate feedback during token creation process
- **Polling Mechanism**: Automatically detects token creation completion
- **Visual Indicators**: Clear visual indicators for success and error states

## Troubleshooting

### Common Issues

**Token Creation Fails**
- Ensure your source wallet has at least 0.1 SOL
- Check that all accounts have at least 0.02 SOL each
- Verify that accounts.json and source-wallet.json exist and are valid

**Slow Performance**
- Use the optimized batch processing by default
- Ensure you're connected to a responsive Solana RPC endpoint
- Try reducing the number of concurrent operations if experiencing rate limiting

**Transaction Errors**
- The application automatically implements retry logic
- Check Solana network status if persistent failures occur
- Ensure proper SOL balance in accounts for transaction fees

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Solana Labs for the web3.js library
- The SPL Token program
- TradingView for embedding chart capabilities