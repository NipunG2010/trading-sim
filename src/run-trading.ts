// src/run-trading.ts
import { Connection } from "@solana/web3.js";
import { TradingEngine, TradingPatternType } from "./trading-engine";
import * as fs from "fs";

// Load token info
const tokenInfo = JSON.parse(fs.readFileSync("../token-info.json", "utf-8"));

// Connect to Solana devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create trading engine
const tradingEngine = new TradingEngine(
  connection,
  tokenInfo.mint,
  tokenInfo.decimals,
  "../accounts.json"
);

// Available trading patterns
const tradingPatterns: Record<TradingPatternType, {
  name: string;
  description: string;
  defaultDuration: number; // in milliseconds
  defaultIntensity: number; // 1-10 scale
}> = {
  wash_trading: {
    name: "Wash Trading",
    description: "High volume trading between the same wallets to create illusion of activity",
    defaultDuration: 30 * 60 * 1000, // 30 minutes
    defaultIntensity: 7
  },
  layering: {
    name: "Layering",
    description: "Creating multiple buy orders at different price levels to create illusion of demand",
    defaultDuration: 45 * 60 * 1000, // 45 minutes
    defaultIntensity: 6
  },
  accumulation: {
    name: "Accumulation",
    description: "Whales gradually buying from retail with minimal price impact",
    defaultDuration: 60 * 60 * 1000, // 1 hour
    defaultIntensity: 5
  },
  distribution: {
    name: "Distribution",
    description: "Whales gradually selling to retail with controlled price impact",
    defaultDuration: 60 * 60 * 1000, // 1 hour
    defaultIntensity: 5
  },
  pump_and_dump: {
    name: "Pump and Dump",
    description: "Rapid price increase followed by quick distribution at the top",
    defaultDuration: 90 * 60 * 1000, // 1.5 hours
    defaultIntensity: 9
  },
  organic_growth: {
    name: "Organic Growth",
    description: "Natural-looking trading with varied wallet types and trade sizes",
    defaultDuration: 120 * 60 * 1000, // 2 hours
    defaultIntensity: 4
  },
  whale_activity: {
    name: "Whale Activity",
    description: "Large trades from whale wallets with significant price impact",
    defaultDuration: 45 * 60 * 1000, // 45 minutes
    defaultIntensity: 8
  },
  retail_fomo: {
    name: "Retail FOMO",
    description: "Many small retail buys with increasing frequency",
    defaultDuration: 60 * 60 * 1000, // 1 hour
    defaultIntensity: 7
  }
};

// Function to run a trading pattern
async function runTradingPattern(patternType: TradingPatternType, duration?: number, intensity?: number): Promise<void> {
  const pattern = tradingPatterns[patternType];
  
  if (!pattern) {
    console.error(`Unknown pattern type: ${patternType}`);
    return;
  }
  
  console.log(`Starting ${pattern.name} pattern...`);
  console.log(`Description: ${pattern.description}`);
  
  const actualDuration = duration || pattern.defaultDuration;
  const actualIntensity = intensity || pattern.defaultIntensity;
  
  console.log(`Duration: ${actualDuration / 60000} minutes`);
  console.log(`Intensity: ${actualIntensity}/10`);
  
  // Start trading
  tradingEngine.startTrading({
    type: patternType,
    duration: actualDuration,
    intensity: actualIntensity
  });
  
  // Wait for pattern to complete
  await new Promise(resolve => setTimeout(resolve, actualDuration + 5000)); // Add 5 seconds buffer
  
  console.log(`${pattern.name} pattern completed.`);
}

// Function to run a sequence of patterns
async function runTradingSequence(patterns: Array<{
  type: TradingPatternType;
  duration?: number;
  intensity?: number;
}>): Promise<void> {
  console.log(`Starting trading sequence with ${patterns.length} patterns...`);
  
  for (const [index, patternConfig] of patterns.entries()) {
    console.log(`\nRunning pattern ${index + 1}/${patterns.length}...`);
    await runTradingPattern(patternConfig.type, patternConfig.duration, patternConfig.intensity);
  }
  
  console.log("\nTrading sequence completed.");
}

// Default 48-hour trading sequence
const defaultSequence = [
  // Phase 1: Initial accumulation (6 hours)
  { type: 'accumulation', duration: 6 * 60 * 60 * 1000, intensity: 4 },
  
  // Phase 2: Organic growth (12 hours)
  { type: 'organic_growth', duration: 12 * 60 * 60 * 1000, intensity: 5 },
  
  // Phase 3: Whale activity (3 hours)
  { type: 'whale_activity', duration: 3 * 60 * 60 * 1000, intensity: 7 },
  
  // Phase 4: Layering (6 hours)
  { type: 'layering', duration: 6 * 60 * 60 * 1000, intensity: 6 },
  
  // Phase 5: Retail FOMO (6 hours)
  { type: 'retail_fomo', duration: 6 * 60 * 60 * 1000, intensity: 8 },
  
  // Phase 6: Wash trading (3 hours)
  { type: 'wash_trading', duration: 3 * 60 * 60 * 1000, intensity: 9 },
  
  // Phase 7: Distribution (12 hours)
  { type: 'distribution', duration: 12 * 60 * 60 * 1000, intensity: 6 }
];

// Command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Run default sequence
  console.log("Running default 48-hour trading sequence...");
  runTradingSequence(defaultSequence).catch(error => {
    console.error("Error running trading sequence:", error);
  });
} else {
  // Run specific pattern
  const patternType = args[0] as TradingPatternType;
  const duration = args[1] ? parseInt(args[1]) * 60 * 1000 : undefined; // Convert minutes to milliseconds
  const intensity = args[2] ? parseInt(args[2]) : undefined;
  
  if (!Object.keys(tradingPatterns).includes(patternType)) {
    console.error(`Unknown pattern type: ${patternType}`);
    console.log("Available patterns:");
    Object.entries(tradingPatterns).forEach(([type, pattern]) => {
      console.log(`- ${type}: ${pattern.name} - ${pattern.description}`);
    });
  } else {
    runTradingPattern(patternType, duration, intensity).catch(error => {
      console.error(`Error running ${patternType} pattern:`, error);
    });
  }
} 