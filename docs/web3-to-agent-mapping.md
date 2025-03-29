# Web3.js to Solana-Agent-Kit Migration Guide

## Core Function Mapping
| Web3.js Function | Solana-Agent-Kit Equivalent | Notes |
|-----------------|---------------------------|-------|
| `new Connection()` | `agent.createConnection()` | Connection pooling handled automatically |
| `Keypair.generate()` | `agent.generateKeypair()` | Includes Zod validation |
| `PublicKey()` | `agent.normalizePublicKey()` | Handles all key formats |
| `getMint()` | `agent.getTokenInfo()` | Unified token interface |
| `getAccount()` | `agent.getAccountInfo()` | Standardized response format |

## TradingService Migration Steps

### 1. Connection Initialization
```typescript
// Before
import { Connection } from '@solana/web3.js';
this.connection = new Connection(RPC_ENDPOINT);

// After
import { SolanaAgentService } from './SolanaAgentService';
this.agent = new SolanaAgentService(RPC_ENDPOINT, 'mainnet');
this.connection = await this.agent.getConnection();
```

### 2. Keypair Handling
```typescript
// Before
import { Keypair } from '@solana/web3.js';
this.mintKeypair = Keypair.generate();

// After
this.mintKeypair = await this.agent.generateKeypair();
```

### 3. Token Operations
```typescript
// Before
import { getMint } from '@solana/spl-token';
const mintInfo = await getMint(connection, publicKey);

// After
const mintInfo = await this.agent.getTokenInfo(publicKey);
```

## Phase Implementation Plan
1. Create adapter layer for backward compatibility
2. Migrate core connection handling
3. Replace all keypair operations
4. Update token operations
5. Refactor transaction flows