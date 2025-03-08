// src/run-trading.js
import { Connection } from "@solana/web3.js";
import {
  movingAverageCrossover,
  fibonacciRetracement,
  bollingerBandSqueeze,
  volumePatternEngineering,
  organicActivitySimulation,
  macdCrossoverSignal,
  rsiDivergence,
  loadAccounts,
  loadTokenInfo
} from "./trading-patterns.js";

/**
 * Runs a sequence of trading patterns to simulate realistic trading activity
 */
async function runTradingPatterns() {
  try {
    console.log("🚀 Starting Trading Pattern Simulation");
    
    // Connect to Solana devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    console.log("Connected to Solana devnet");
    
    // Load accounts and token info
    console.log("Loading accounts and token info...");
    const accounts = loadAccounts();
    const tokenInfo = loadTokenInfo();
    
    console.log(`Loaded ${accounts.length} accounts`);
    console.log(`Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`Mint: ${tokenInfo.mint}`);
    
    // Add account types if not present
    const processedAccounts = accounts.map((account, index) => {
      if (!account.type) {
        // Assign first 40% of accounts as whales, rest as retail
        account.type = index < accounts.length * 0.4 ? "whale" : "retail";
      }
      return account;
    });
    
    // Run patterns in sequence
    console.log("\n📊 Running trading patterns in sequence");
    
    // Pattern 1: Moving Average Crossover
    await movingAverageCrossover(connection, processedAccounts, tokenInfo, {
      durationMinutes: 10, // Shorter duration for testing
      tradeIntervalSeconds: 10,
      volumeMultiplier: 1.2,
      whaleParticipation: 0.4
    });
    
    // Pattern 2: Fibonacci Retracement
    await fibonacciRetracement(connection, processedAccounts, tokenInfo, {
      durationMinutes: 10, // Shorter duration for testing
      tradeIntervalSeconds: 10,
      volumeMultiplier: 1.5,
      initialTrend: "bullish"
    });
    
    // Pattern 3: Bollinger Band Squeeze
    await bollingerBandSqueeze(connection, processedAccounts, tokenInfo, {
      durationMinutes: 10, // Shorter duration for testing
      tradeIntervalSeconds: 10,
      volumeMultiplier: 1.8,
      breakoutDirection: "up"
    });
    
    // Pattern 4: Volume Pattern Engineering
    await volumePatternEngineering(connection, processedAccounts, tokenInfo, {
      durationMinutes: 10, // Shorter duration for testing
      tradeIntervalSeconds: 10,
      volumeMultiplier: 1.3,
      patternType: "accumulation" // Options: "accumulation", "distribution", "vwap_bounce", "obv_trend"
    });
    
    // Pattern 5: Organic Activity Simulation
    await organicActivitySimulation(connection, processedAccounts, tokenInfo, {
      durationMinutes: 10, // Shorter duration for testing
      tradeIntervalSeconds: 8,
      volumeMultiplier: 1.2,
      simulationType: "mixed" // Options: "mixed", "microtransactions", "stepping", "resistance_breakthrough"
    });
    
    // Pattern 6: MACD Crossover Signal
    await macdCrossoverSignal(connection, processedAccounts, tokenInfo, {
      durationMinutes: 10, // Shorter duration for testing
      tradeIntervalSeconds: 10,
      volumeMultiplier: 1.4,
      initialTrend: "bullish" // Options: "bullish", "bearish"
    });
    
    // Pattern 7: RSI Divergence
    await rsiDivergence(connection, processedAccounts, tokenInfo, {
      durationMinutes: 10, // Shorter duration for testing
      tradeIntervalSeconds: 10,
      volumeMultiplier: 1.3,
      divergenceType: "bullish" // Options: "bullish", "bearish"
    });
    
    console.log("\n✅ Trading Pattern Simulation completed successfully");
    
  } catch (error) {
    console.error("Error running trading patterns:", error);
  }
}

// Check if a specific pattern was requested via command line arguments
const runSpecificPattern = async () => {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const patternName = args[0];
    const durationMinutes = args[1] ? parseInt(args[1]) : 10;
    const intensity = args[2] ? parseInt(args[2]) : 5;
    
    console.log(`Running specific pattern: ${patternName}`);
    console.log(`Duration: ${durationMinutes} minutes`);
    console.log(`Intensity: ${intensity}/10`);
    
    // Connect to Solana devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Load accounts and token info
    const accounts = loadAccounts();
    const tokenInfo = loadTokenInfo();
    
    // Add account types if not present
    const processedAccounts = accounts.map((account, index) => {
      if (!account.type) {
        account.type = index < accounts.length * 0.4 ? "whale" : "retail";
      }
      return account;
    });
    
    // Calculate volume multiplier based on intensity (1-10)
    const volumeMultiplier = 0.5 + (intensity / 10) * 1.5;
    
    // Run the requested pattern
    switch (patternName) {
      case "moving_average":
        await movingAverageCrossover(connection, processedAccounts, tokenInfo, {
          durationMinutes,
          tradeIntervalSeconds: 15,
          volumeMultiplier,
          whaleParticipation: 0.3 + (intensity / 10) * 0.4
        });
        break;
      case "fibonacci":
        await fibonacciRetracement(connection, processedAccounts, tokenInfo, {
          durationMinutes,
          tradeIntervalSeconds: 15,
          volumeMultiplier,
          initialTrend: intensity > 5 ? "bullish" : "bearish"
        });
        break;
      case "bollinger":
        await bollingerBandSqueeze(connection, processedAccounts, tokenInfo, {
          durationMinutes,
          tradeIntervalSeconds: 15,
          volumeMultiplier,
          breakoutDirection: intensity > 5 ? "up" : "down"
        });
        break;
      case "volume_pattern":
        const volumePatternTypes = ["accumulation", "distribution", "vwap_bounce", "obv_trend"];
        const selectedVolumePattern = volumePatternTypes[Math.min(intensity, 10) % volumePatternTypes.length];
        
        await volumePatternEngineering(connection, processedAccounts, tokenInfo, {
          durationMinutes,
          tradeIntervalSeconds: 12,
          volumeMultiplier,
          patternType: selectedVolumePattern
        });
        break;
      case "organic":
        const organicTypes = ["mixed", "microtransactions", "stepping", "resistance_breakthrough"];
        const selectedOrganicType = organicTypes[Math.min(intensity, 10) % organicTypes.length];
        
        await organicActivitySimulation(connection, processedAccounts, tokenInfo, {
          durationMinutes,
          tradeIntervalSeconds: 8,
          volumeMultiplier,
          simulationType: selectedOrganicType
        });
        break;
      case "macd":
        await macdCrossoverSignal(connection, processedAccounts, tokenInfo, {
          durationMinutes,
          tradeIntervalSeconds: 12,
          volumeMultiplier,
          initialTrend: intensity > 5 ? "bullish" : "bearish"
        });
        break;
      case "rsi":
        await rsiDivergence(connection, processedAccounts, tokenInfo, {
          durationMinutes,
          tradeIntervalSeconds: 12,
          volumeMultiplier,
          divergenceType: intensity > 5 ? "bullish" : "bearish"
        });
        break;
      default:
        console.error(`Unknown pattern: ${patternName}`);
        console.log("Available patterns: moving_average, fibonacci, bollinger, volume_pattern, organic, macd, rsi");
        break;
    }
  } else {
    // No specific pattern requested, run the full sequence
    await runTradingPatterns();
  }
};

// Run the appropriate function
runSpecificPattern(); 