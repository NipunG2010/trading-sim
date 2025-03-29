# Trading Simulator 2.0 Technical Specification

## Critical Files

### Configuration
- `.env.example` - Environment variable template
- `token-config.json` - Token configuration
- `craco.config.js` - CRACO configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Core Functionality
- `src/App.tsx` - Main application component
- `src/trading/TradingController.ts` - Trading controller
- `src/services/tradingService.ts` - Core trading service
- `src/services/SolanaAgentService.ts` - Solana agent integration
- `src/services/JupiterService.ts` - Jupiter service integration

### Trading Strategies
- `src/trading/strategies/BaseStrategy.ts` - Strategy base class
- `src/trading/strategies/TechnicalStrategy.ts` - Technical indicators
- `src/trading/strategies/VolumeStrategy.ts` - Volume analysis
- `src/trading/patterns/BaseTradingPattern.ts` - Pattern base class
- `src/trading/patterns/MovingAverageCrossover.ts` - MA crossover pattern

### Services
- `src/services/cacheService.ts` - Caching service
- `src/services/logger.ts` - Logging service
- `src/services/wallet-storage.ts` - Wallet storage
- `src/services/transactionService.ts` - Transaction handling

### Documentation
- `README.md` - Project overview
- `docs/solana-agent-kit-migration.md` - Solana agent migration
- `docs/trading-service-migration.md` - Trading service migration
- `docs/web3-to-agent-mapping.md` - Web3 agent mapping

### Scripts
- `scripts/generate-accounts.js` - Account generation
- `scripts/migrate-sensitive-data.js` - Data migration
- `scripts/generate-encryption-key.ts` - Encryption key generation
- `start-sim.sh` - Simulation startup script