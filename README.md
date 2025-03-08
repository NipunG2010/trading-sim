# Solana Token Trading Simulator

A sophisticated system for simulating organic trading activity on Solana-based SPL tokens. This project creates the illusion of natural market activity to attract real investors through carefully crafted trading patterns.

## Features

- **Wallet Management**: Create and manage 50 Solana wallets with secure key storage
- **Token Creation**: Generate SPL tokens with customizable supply and metadata
- **Distribution System**: Distribute tokens to whale and retail wallets with realistic patterns
- **Transaction Queue**: Handle rate limits and optimize gas fees
- **Advanced Trading Patterns**: 8 different trading patterns to simulate various market conditions
- **Real-time Monitoring**: Dashboard with price and volume charts
- **Trading Controls**: Start, stop, and configure trading patterns

## Trading Patterns

1. **Wash Trading**: High volume trading between the same wallets to create illusion of activity
2. **Layering**: Creating multiple buy orders at different price levels to create illusion of demand
3. **Accumulation**: Whales gradually buying from retail with minimal price impact
4. **Distribution**: Whales gradually selling to retail with controlled price impact
5. **Pump and Dump**: Rapid price increase followed by quick distribution at the top
6. **Organic Growth**: Natural-looking trading with varied wallet types and trade sizes
7. **Whale Activity**: Large trades from whale wallets with significant price impact
8. **Retail FOMO**: Many small retail buys with increasing frequency

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Solana CLI (for wallet funding)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/solana-token-trading-simulator.git
   cd solana-token-trading-simulator
   ```

2. Install dependencies:
   ```
   chmod +x install-dependencies.sh
   ./install-dependencies.sh
   ```

### Usage

#### 1. Create Wallets

Create 50 Solana wallets for trading:

```
npm run create-accounts
```

This will generate a file called `accounts.json` with the wallet information.

#### 2. Test Wallets

Verify that the wallets were created correctly:

```
npm run test-accounts
```

#### 3. Fund Wallets

Print commands to fund the wallets with SOL:

```
npm run fund-accounts
```

This will output commands that you can run to airdrop SOL to each wallet on the Solana devnet.

#### 4. Create and Distribute Token

Create an SPL token and distribute it to the wallets:

```
npm run create-token
```

This will create a token with 1 billion supply and distribute it to the wallets according to the whale/retail allocation.

#### 5. Run Trading Patterns

Run the default 48-hour trading sequence:

```
npm run run-trading
```

Or run a specific trading pattern:

```
npm run run-pattern wash_trading 30 7
```

Parameters:
- Pattern: wash_trading, layering, accumulation, distribution, pump_and_dump, organic_growth, whale_activity, retail_fomo
- Duration: Time in minutes
- Intensity: 1-10 scale

#### 6. Start the UI Dashboard

Start the React UI dashboard:

```
npm start
```

This will start the dashboard at http://localhost:3000.

## Architecture

The project consists of several modules:

- **Wallet Creation**: Generates and manages Solana wallets
- **Token Creation**: Creates and distributes SPL tokens
- **Transaction Queue**: Handles transaction batching and retry logic
- **Trading Engine**: Implements various trading patterns
- **UI Dashboard**: Provides real-time monitoring and controls

## Technical Details

- Built with TypeScript for type safety
- Uses Solana Web3.js for blockchain interactions
- SPL Token program for token operations
- React for the UI dashboard
- Chart.js for data visualization

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is for educational purposes only. Using this system to manipulate markets may violate securities laws and regulations in many jurisdictions. The authors do not endorse or encourage any form of market manipulation or fraudulent activity.

## Acknowledgements

- Solana Foundation for the blockchain infrastructure
- SPL Token program for token standards
- React and Chart.js for the UI components