// src/trading-patterns.js
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction 
} from "@solana/spl-token";
import * as fs from "fs";

/**
 * Trading Patterns Implementation
 * 
 * This file contains implementations of various trading patterns that can be
 * used to simulate realistic trading activity for a token.
 */

// Utility function to sleep for a specified number of milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to get a random number between min and max
const getRandomNumber = (min, max) => Math.random() * (max - min) + min;

// Utility function to get a random integer between min and max (inclusive)
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Loads accounts from the accounts.json file
 * @returns {Array} Array of account objects
 */
function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync("accounts.json", "utf-8"));
  } catch (error) {
    console.error("Error loading accounts:", error);
    throw error;
  }
}

/**
 * Loads token information from the token-info.json file
 * @returns {Object} Token information object
 */
function loadTokenInfo() {
  try {
    return JSON.parse(fs.readFileSync("token-info.json", "utf-8"));
  } catch (error) {
    console.error("Error loading token info:", error);
    throw error;
  }
}

/**
 * Creates a keypair from a secret key
 * @param {Array} secretKey - Secret key as an array of numbers
 * @returns {Keypair} Solana keypair
 */
function createKeypairFromSecretKey(secretKey) {
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

/**
 * Transfers tokens between accounts
 * @param {Connection} connection - Solana connection
 * @param {Keypair} senderKeypair - Sender's keypair
 * @param {PublicKey} receiverPublicKey - Receiver's public key
 * @param {PublicKey} tokenMint - Token mint public key
 * @param {number} amount - Amount of tokens to transfer
 * @param {number} decimals - Token decimals
 * @returns {string} Transaction signature
 */
async function transferTokens(
  connection,
  senderKeypair,
  receiverPublicKey,
  tokenMint,
  amount,
  decimals
) {
  try {
    // Get or create associated token accounts
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      tokenMint,
      senderKeypair.publicKey
    );

    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      tokenMint,
      receiverPublicKey
    );

    // Calculate amount with decimals
    const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount.address,
      receiverTokenAccount.address,
      senderKeypair.publicKey,
      adjustedAmount
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );

    return signature;
  } catch (error) {
    console.error("Error transferring tokens:", error);
    throw error;
  }
}

/**
 * Implements a Moving Average Crossover pattern
 * Simulates price movement based on short and long moving average crossovers
 * @param {Connection} connection - Solana connection
 * @param {Array} accounts - Array of account objects
 * @param {Object} tokenInfo - Token information object
 * @param {Object} options - Pattern options
 * @returns {Promise<void>}
 */
async function movingAverageCrossover(
  connection,
  accounts,
  tokenInfo,
  options = {}
) {
  const {
    durationMinutes = 30,
    tradeIntervalSeconds = 20,
    volumeMultiplier = 1.0,
    whaleParticipation = 0.3,
  } = options;

  console.log("\n🔄 Starting Moving Average Crossover Pattern");
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Trade Interval: ${tradeIntervalSeconds} seconds`);
  
  const tokenMint = new PublicKey(tokenInfo.mint);
  const decimals = tokenInfo.decimals;
  
  // Separate whale and retail accounts
  const whaleAccounts = accounts.filter(account => account.type === "whale");
  const retailAccounts = accounts.filter(account => account.type === "retail");
  
  if (whaleAccounts.length === 0 || retailAccounts.length === 0) {
    console.error("Error: Need both whale and retail accounts for this pattern");
    return;
  }
  
  // Calculate number of trades
  const totalTrades = Math.floor((durationMinutes * 60) / tradeIntervalSeconds);
  
  // Simulate moving averages
  let shortMA = getRandomNumber(90, 110); // Starting point
  let longMA = shortMA * getRandomNumber(0.95, 1.05);
  let trend = "neutral";
  let trendStrength = 0;
  
  console.log(`\nInitial conditions:`);
  console.log(`Short MA: ${shortMA.toFixed(2)}`);
  console.log(`Long MA: ${longMA.toFixed(2)}`);
  
  // Execute trades
  for (let i = 0; i < totalTrades; i++) {
    try {
      // Update moving averages
      const shortMAChange = getRandomNumber(-3, 3);
      const longMAChange = getRandomNumber(-1, 1);
      
      shortMA += shortMAChange;
      longMA += longMAChange;
      
      // Determine trend based on MA crossover
      const previousTrend = trend;
      if (shortMA > longMA) {
        trend = "bullish";
        trendStrength = Math.min(trendStrength + 0.1, 1.0);
      } else if (shortMA < longMA) {
        trend = "bearish";
        trendStrength = Math.min(trendStrength + 0.1, 1.0);
      } else {
        trend = "neutral";
        trendStrength = 0;
      }
      
      // Log trend change
      if (trend !== previousTrend) {
        console.log(`\n${new Date().toISOString()} - Trend changed to ${trend.toUpperCase()}`);
        console.log(`Short MA: ${shortMA.toFixed(2)}, Long MA: ${longMA.toFixed(2)}`);
      }
      
      // Determine if whale or retail will trade
      const isWhaleTrade = Math.random() < whaleParticipation;
      
      // Select accounts for trade
      let sender, receiver;
      if (isWhaleTrade) {
        sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
        receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
      } else {
        sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        
        // Make sure sender and receiver are different
        while (sender.publicKey === receiver.publicKey) {
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      }
      
      // Determine trade amount based on trend and account type
      let baseAmount;
      if (isWhaleTrade) {
        baseAmount = getRandomNumber(10000, 50000);
      } else {
        baseAmount = getRandomNumber(1000, 5000);
      }
      
      // Adjust amount based on trend
      let tradeAmount;
      if (trend === "bullish") {
        tradeAmount = baseAmount * (1 + trendStrength);
      } else if (trend === "bearish") {
        tradeAmount = baseAmount * (1 - trendStrength * 0.5);
      } else {
        tradeAmount = baseAmount;
      }
      
      // Apply volume multiplier
      tradeAmount *= volumeMultiplier;
      
      // Execute the trade
      const senderKeypair = createKeypairFromSecretKey(sender.secretKey);
      const receiverPublicKey = new PublicKey(receiver.publicKey);
      
      const signature = await transferTokens(
        connection,
        senderKeypair,
        receiverPublicKey,
        tokenMint,
        tradeAmount,
        decimals
      );
      
      console.log(`Trade ${i+1}/${totalTrades}: ${isWhaleTrade ? "🐋 Whale" : "👤 Retail"} transferred ${tradeAmount.toFixed(2)} tokens`);
      console.log(`From: ${sender.publicKey.slice(0, 8)}...`);
      console.log(`To: ${receiver.publicKey.slice(0, 8)}...`);
      console.log(`Signature: ${signature.slice(0, 16)}...`);
      
      // Wait for the next trade interval
      await sleep(tradeIntervalSeconds * 1000);
      
    } catch (error) {
      console.error(`Error in trade ${i+1}:`, error);
      // Continue with next trade
      await sleep(5000); // Wait a bit longer after an error
    }
  }
  
  console.log("\n✅ Moving Average Crossover Pattern completed");
}

/**
 * Implements a Fibonacci Retracement pattern
 * Simulates price movement based on Fibonacci retracement levels
 * @param {Connection} connection - Solana connection
 * @param {Array} accounts - Array of account objects
 * @param {Object} tokenInfo - Token information object
 * @param {Object} options - Pattern options
 * @returns {Promise<void>}
 */
async function fibonacciRetracement(
  connection,
  accounts,
  tokenInfo,
  options = {}
) {
  const {
    durationMinutes = 45,
    tradeIntervalSeconds = 15,
    volumeMultiplier = 1.2,
    initialTrend = "bullish", // or "bearish"
  } = options;

  console.log("\n🔄 Starting Fibonacci Retracement Pattern");
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Trade Interval: ${tradeIntervalSeconds} seconds`);
  console.log(`Initial Trend: ${initialTrend}`);
  
  const tokenMint = new PublicKey(tokenInfo.mint);
  const decimals = tokenInfo.decimals;
  
  // Separate whale and retail accounts
  const whaleAccounts = accounts.filter(account => account.type === "whale");
  const retailAccounts = accounts.filter(account => account.type === "retail");
  
  // Calculate number of trades
  const totalTrades = Math.floor((durationMinutes * 60) / tradeIntervalSeconds);
  
  // Define Fibonacci retracement levels
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  
  // Initialize price simulation
  let basePrice = 100; // Arbitrary starting price
  let currentPrice = basePrice;
  let trend = initialTrend;
  let currentFibLevel = 0;
  let targetFibLevel = initialTrend === "bullish" ? 6 : 0; // Target the highest or lowest level
  
  console.log(`\nInitial conditions:`);
  console.log(`Base Price: ${basePrice}`);
  console.log(`Current Price: ${currentPrice}`);
  console.log(`Trend: ${trend}`);
  
  // Execute trades
  for (let i = 0; i < totalTrades; i++) {
    try {
      // Update price based on current trend and fib level target
      const currentFibValue = fibLevels[currentFibLevel];
      const targetFibValue = fibLevels[targetFibLevel];
      
      // Move price toward target
      if (trend === "bullish") {
        currentPrice += getRandomNumber(0.5, 2) * (targetFibValue - currentFibValue);
      } else {
        currentPrice -= getRandomNumber(0.5, 2) * (currentFibValue - targetFibValue);
      }
      
      // Check if we've reached a new Fibonacci level
      let newFibLevel = currentFibLevel;
      for (let j = 0; j < fibLevels.length; j++) {
        const levelPrice = basePrice + (fibLevels[j] - 0.5) * basePrice;
        if (Math.abs(currentPrice - levelPrice) < 2) {
          newFibLevel = j;
          break;
        }
      }
      
      // If we've reached a new level, log it and possibly change direction
      if (newFibLevel !== currentFibLevel) {
        currentFibLevel = newFibLevel;
        console.log(`\n${new Date().toISOString()} - Reached Fibonacci level ${fibLevels[currentFibLevel]}`);
        console.log(`Current Price: ${currentPrice.toFixed(2)}`);
        
        // Possibly reverse trend at certain levels
        if (
          (trend === "bullish" && currentFibLevel === targetFibLevel) ||
          (trend === "bearish" && currentFibLevel === targetFibLevel) ||
          Math.random() < 0.3 // Random reversal chance
        ) {
          trend = trend === "bullish" ? "bearish" : "bullish";
          targetFibLevel = trend === "bullish" ? 6 : 0;
          console.log(`Trend reversed to ${trend.toUpperCase()}`);
          
          // Reset base price for new trend
          basePrice = currentPrice;
        }
      }
      
      // Determine if whale or retail will trade
      const isWhaleTrade = Math.random() < 0.4; // 40% chance of whale trade
      
      // Select accounts for trade
      let sender, receiver;
      if (isWhaleTrade) {
        sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
        
        // In bullish trend, whales sell to retail; in bearish, they buy
        if (trend === "bullish") {
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        } else {
          // Swap sender and receiver
          receiver = sender;
          sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      } else {
        // Retail trading with each other
        sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        
        // Make sure sender and receiver are different
        while (sender.publicKey === receiver.publicKey) {
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      }
      
      // Determine trade amount based on fib level and account type
      let baseAmount;
      if (isWhaleTrade) {
        baseAmount = getRandomNumber(20000, 100000);
      } else {
        baseAmount = getRandomNumber(2000, 10000);
      }
      
      // Adjust amount based on current Fibonacci level
      const fibMultiplier = 0.5 + fibLevels[currentFibLevel];
      let tradeAmount = baseAmount * fibMultiplier;
      
      // Apply volume multiplier
      tradeAmount *= volumeMultiplier;
      
      // Execute the trade
      const senderKeypair = createKeypairFromSecretKey(sender.secretKey);
      const receiverPublicKey = new PublicKey(receiver.publicKey);
      
      const signature = await transferTokens(
        connection,
        senderKeypair,
        receiverPublicKey,
        tokenMint,
        tradeAmount,
        decimals
      );
      
      console.log(`Trade ${i+1}/${totalTrades}: ${isWhaleTrade ? "🐋 Whale" : "👤 Retail"} transferred ${tradeAmount.toFixed(2)} tokens`);
      console.log(`From: ${sender.publicKey.slice(0, 8)}...`);
      console.log(`To: ${receiver.publicKey.slice(0, 8)}...`);
      console.log(`Signature: ${signature.slice(0, 16)}...`);
      
      // Wait for the next trade interval
      await sleep(tradeIntervalSeconds * 1000);
      
    } catch (error) {
      console.error(`Error in trade ${i+1}:`, error);
      // Continue with next trade
      await sleep(5000); // Wait a bit longer after an error
    }
  }
  
  console.log("\n✅ Fibonacci Retracement Pattern completed");
}

/**
 * Implements a Bollinger Band Squeeze pattern
 * Simulates price movement based on Bollinger Band contractions and expansions
 * @param {Connection} connection - Solana connection
 * @param {Array} accounts - Array of account objects
 * @param {Object} tokenInfo - Token information object
 * @param {Object} options - Pattern options
 * @returns {Promise<void>}
 */
async function bollingerBandSqueeze(
  connection,
  accounts,
  tokenInfo,
  options = {}
) {
  const {
    durationMinutes = 40,
    tradeIntervalSeconds = 15,
    volumeMultiplier = 1.5,
    breakoutDirection = Math.random() < 0.5 ? "up" : "down",
  } = options;

  console.log("\n🔄 Starting Bollinger Band Squeeze Pattern");
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Trade Interval: ${tradeIntervalSeconds} seconds`);
  console.log(`Breakout Direction: ${breakoutDirection}`);
  
  const tokenMint = new PublicKey(tokenInfo.mint);
  const decimals = tokenInfo.decimals;
  
  // Separate whale and retail accounts
  const whaleAccounts = accounts.filter(account => account.type === "whale");
  const retailAccounts = accounts.filter(account => account.type === "retail");
  
  // Calculate number of trades
  const totalTrades = Math.floor((durationMinutes * 60) / tradeIntervalSeconds);
  
  // Initialize Bollinger Band parameters
  let price = 100; // Arbitrary starting price
  let volatility = 10; // Initial volatility (band width)
  let phase = "contraction"; // Start with contraction phase
  let phaseProgress = 0; // Progress through current phase (0-1)
  
  console.log(`\nInitial conditions:`);
  console.log(`Price: ${price}`);
  console.log(`Volatility: ${volatility}`);
  console.log(`Phase: ${phase}`);
  
  // Execute trades
  for (let i = 0; i < totalTrades; i++) {
    try {
      // Update phase progress
      phaseProgress += 1 / (totalTrades / 3); // Complete each phase in 1/3 of total trades
      
      // Check if we should move to next phase
      if (phaseProgress >= 1) {
        phaseProgress = 0;
        if (phase === "contraction") {
          phase = "squeeze";
          console.log(`\n${new Date().toISOString()} - Entered squeeze phase`);
        } else if (phase === "squeeze") {
          phase = "breakout";
          console.log(`\n${new Date().toISOString()} - Breakout phase started (${breakoutDirection})`);
        } else if (phase === "breakout") {
          phase = "contraction";
          console.log(`\n${new Date().toISOString()} - Returning to contraction phase`);
        }
      }
      
      // Update price and volatility based on current phase
      if (phase === "contraction") {
        // Gradually decrease volatility
        volatility = Math.max(2, volatility - getRandomNumber(0.2, 0.5));
        // Small random price movements
        price += getRandomNumber(-2, 2);
      } else if (phase === "squeeze") {
        // Minimal volatility
        volatility = Math.max(1, volatility - getRandomNumber(0.1, 0.3));
        // Very small price movements
        price += getRandomNumber(-1, 1);
      } else if (phase === "breakout") {
        // Rapidly increasing volatility
        volatility += getRandomNumber(0.5, 2);
        // Strong directional price movement
        if (breakoutDirection === "up") {
          price += getRandomNumber(1, 5) * volatility / 5;
        } else {
          price -= getRandomNumber(1, 5) * volatility / 5;
        }
      }
      
      // Ensure price doesn't go negative
      price = Math.max(1, price);
      
      // Log significant changes
      if (i % 10 === 0 || phase === "breakout") {
        console.log(`\nPrice: ${price.toFixed(2)}, Volatility: ${volatility.toFixed(2)}, Phase: ${phase}`);
      }
      
      // Determine if whale or retail will trade
      let isWhaleTrade;
      if (phase === "contraction") {
        isWhaleTrade = Math.random() < 0.3; // 30% whale activity
      } else if (phase === "squeeze") {
        isWhaleTrade = Math.random() < 0.2; // 20% whale activity (quieter)
      } else { // breakout
        isWhaleTrade = Math.random() < 0.6; // 60% whale activity
      }
      
      // Select accounts for trade
      let sender, receiver;
      if (isWhaleTrade) {
        // In breakout phase, whales act according to breakout direction
        if (phase === "breakout") {
          if (breakoutDirection === "up") {
            // Whales buying in upward breakout
            sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
            receiver = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          } else {
            // Whales selling in downward breakout
            sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
            receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          }
        } else {
          // Normal whale behavior in other phases
          sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      } else {
        // Retail trading with each other
        sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        
        // Make sure sender and receiver are different
        while (sender.publicKey === receiver.publicKey) {
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      }
      
      // Determine trade amount based on phase and account type
      let baseAmount;
      if (isWhaleTrade) {
        baseAmount = getRandomNumber(10000, 80000);
      } else {
        baseAmount = getRandomNumber(1000, 8000);
      }
      
      // Adjust amount based on current phase
      let phaseMultiplier;
      if (phase === "contraction") {
        phaseMultiplier = 0.8;
      } else if (phase === "squeeze") {
        phaseMultiplier = 0.5;
      } else { // breakout
        phaseMultiplier = 2.0;
      }
      
      let tradeAmount = baseAmount * phaseMultiplier;
      
      // Apply volume multiplier
      tradeAmount *= volumeMultiplier;
      
      // Execute the trade
      const senderKeypair = createKeypairFromSecretKey(sender.secretKey);
      const receiverPublicKey = new PublicKey(receiver.publicKey);
      
      const signature = await transferTokens(
        connection,
        senderKeypair,
        receiverPublicKey,
        tokenMint,
        tradeAmount,
        decimals
      );
      
      console.log(`Trade ${i+1}/${totalTrades}: ${isWhaleTrade ? "🐋 Whale" : "👤 Retail"} transferred ${tradeAmount.toFixed(2)} tokens`);
      console.log(`From: ${sender.publicKey.slice(0, 8)}...`);
      console.log(`To: ${receiver.publicKey.slice(0, 8)}...`);
      console.log(`Signature: ${signature.slice(0, 16)}...`);
      
      // Wait for the next trade interval
      await sleep(tradeIntervalSeconds * 1000);
      
    } catch (error) {
      console.error(`Error in trade ${i+1}:`, error);
      // Continue with next trade
      await sleep(5000); // Wait a bit longer after an error
    }
  }
  
  console.log("\n✅ Bollinger Band Squeeze Pattern completed");
}

/**
 * Implements a Volume Pattern Engineering pattern
 * Simulates accumulation/distribution models, VWAP support/resistance, and OBV trends
 * @param {Connection} connection - Solana connection
 * @param {Array} accounts - Array of account objects
 * @param {Object} tokenInfo - Token information object
 * @param {Object} options - Pattern options
 * @returns {Promise<void>}
 */
async function volumePatternEngineering(
  connection,
  accounts,
  tokenInfo,
  options = {}
) {
  const {
    durationMinutes = 35,
    tradeIntervalSeconds = 12,
    volumeMultiplier = 1.3,
    patternType = "accumulation", // or "distribution", "vwap_bounce", "obv_trend"
  } = options;

  console.log("\n🔄 Starting Volume Pattern Engineering");
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Trade Interval: ${tradeIntervalSeconds} seconds`);
  console.log(`Pattern Type: ${patternType}`);
  
  const tokenMint = new PublicKey(tokenInfo.mint);
  const decimals = tokenInfo.decimals;
  
  // Separate whale and retail accounts
  const whaleAccounts = accounts.filter(account => account.type === "whale");
  const retailAccounts = accounts.filter(account => account.type === "retail");
  
  // Calculate number of trades
  const totalTrades = Math.floor((durationMinutes * 60) / tradeIntervalSeconds);
  
  // Initialize price and volume simulation
  let price = 100; // Arbitrary starting price
  let cumulativeVolume = 0;
  let obvValue = 0; // On-Balance Volume value
  let phase = "start";
  let phaseProgress = 0;
  
  console.log(`\nInitial conditions:`);
  console.log(`Price: ${price}`);
  console.log(`Pattern Type: ${patternType}`);
  
  // Execute trades
  for (let i = 0; i < totalTrades; i++) {
    try {
      // Update phase progress
      phaseProgress += 1 / (totalTrades / 3); // Complete each phase in 1/3 of total trades
      
      // Check if we should move to next phase
      if (phaseProgress >= 1) {
        phaseProgress = 0;
        if (phase === "start") {
          phase = "middle";
          console.log(`\n${new Date().toISOString()} - Entered middle phase`);
        } else if (phase === "middle") {
          phase = "end";
          console.log(`\n${new Date().toISOString()} - Entered end phase`);
        }
      }
      
      // Update price and volume based on pattern type and phase
      let priceChange = 0;
      let volumeProfile = "normal";
      
      if (patternType === "accumulation") {
        // Accumulation pattern: sideways price with increasing volume, then breakout
        if (phase === "start") {
          // Initial phase: slight downtrend with decreasing volume
          priceChange = getRandomNumber(-1.5, 0.5);
          volumeProfile = "decreasing";
        } else if (phase === "middle") {
          // Middle phase: sideways with increasing volume (accumulation)
          priceChange = getRandomNumber(-0.8, 0.8);
          volumeProfile = "increasing";
        } else { // end phase
          // End phase: upward breakout with high volume
          priceChange = getRandomNumber(0.5, 2.5);
          volumeProfile = "high";
        }
      } else if (patternType === "distribution") {
        // Distribution pattern: sideways price with increasing volume, then breakdown
        if (phase === "start") {
          // Initial phase: slight uptrend with decreasing volume
          priceChange = getRandomNumber(-0.5, 1.5);
          volumeProfile = "decreasing";
        } else if (phase === "middle") {
          // Middle phase: sideways with increasing volume (distribution)
          priceChange = getRandomNumber(-0.8, 0.8);
          volumeProfile = "increasing";
        } else { // end phase
          // End phase: downward breakdown with high volume
          priceChange = getRandomNumber(-2.5, -0.5);
          volumeProfile = "high";
        }
      } else if (patternType === "vwap_bounce") {
        // VWAP support/resistance bounce pattern
        if (phase === "start") {
          // Initial phase: trend toward VWAP
          priceChange = getRandomNumber(-1.0, 1.0);
        } else if (phase === "middle") {
          // Middle phase: test VWAP with increasing volume
          priceChange = getRandomNumber(-0.5, 0.5);
          volumeProfile = "increasing";
        } else { // end phase
          // End phase: bounce off VWAP with high volume
          const bounceDirection = Math.random() < 0.5 ? 1 : -1;
          priceChange = bounceDirection * getRandomNumber(1.0, 2.0);
          volumeProfile = "high";
        }
      } else if (patternType === "obv_trend") {
        // OBV trend leading indicator pattern
        if (phase === "start") {
          // Initial phase: price and OBV aligned
          priceChange = getRandomNumber(-1.0, 1.0);
          // OBV follows price
          obvValue += priceChange > 0 ? getRandomNumber(1000, 2000) : -getRandomNumber(1000, 2000);
        } else if (phase === "middle") {
          // Middle phase: OBV divergence (OBV rises while price stays flat or falls)
          priceChange = getRandomNumber(-1.0, 0.2);
          // OBV rises regardless of price
          obvValue += getRandomNumber(1000, 3000);
          console.log(`OBV rising while price ${priceChange > 0 ? 'rises slightly' : 'falls'}: ${obvValue.toFixed(0)}`);
        } else { // end phase
          // End phase: price follows OBV (breakout)
          priceChange = getRandomNumber(1.0, 3.0);
          obvValue += getRandomNumber(3000, 5000);
          console.log(`Price following OBV higher: ${obvValue.toFixed(0)}`);
        }
      }
      
      // Update price
      price += priceChange;
      price = Math.max(1, price); // Ensure price doesn't go negative
      
      // Determine trade volume based on volume profile
      let volumeMultiplierForTrade;
      if (volumeProfile === "decreasing") {
        volumeMultiplierForTrade = 0.5 + (1 - phaseProgress) * 0.5;
      } else if (volumeProfile === "increasing") {
        volumeMultiplierForTrade = 0.5 + phaseProgress * 1.0;
      } else if (volumeProfile === "high") {
        volumeMultiplierForTrade = 1.5 + getRandomNumber(0, 1.0);
      } else { // normal
        volumeMultiplierForTrade = 1.0;
      }
      
      // Determine if whale or retail will trade based on pattern and phase
      let isWhaleTrade;
      if (patternType === "accumulation") {
        if (phase === "start") {
          isWhaleTrade = Math.random() < 0.3; // 30% whale activity (selling)
        } else if (phase === "middle") {
          isWhaleTrade = Math.random() < 0.7; // 70% whale activity (buying quietly)
        } else { // end
          isWhaleTrade = Math.random() < 0.5; // 50% whale activity (some selling into strength)
        }
      } else if (patternType === "distribution") {
        if (phase === "start") {
          isWhaleTrade = Math.random() < 0.3; // 30% whale activity (buying)
        } else if (phase === "middle") {
          isWhaleTrade = Math.random() < 0.7; // 70% whale activity (selling quietly)
        } else { // end
          isWhaleTrade = Math.random() < 0.6; // 60% whale activity (more selling)
        }
      } else {
        // Default behavior for other patterns
        isWhaleTrade = Math.random() < 0.4; // 40% whale activity
      }
      
      // Select accounts for trade
      let sender, receiver;
      if (isWhaleTrade) {
        if ((patternType === "accumulation" && phase !== "start") || 
            (patternType === "distribution" && phase === "start")) {
          // Whales buying
          sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          receiver = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
        } else {
          // Whales selling
          sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      } else {
        // Retail trading with each other
        sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        
        // Make sure sender and receiver are different
        while (sender.publicKey === receiver.publicKey) {
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      }
      
      // Determine trade amount
      let baseAmount;
      if (isWhaleTrade) {
        baseAmount = getRandomNumber(15000, 90000);
      } else {
        baseAmount = getRandomNumber(1500, 9000);
      }
      
      // Apply volume profile multiplier
      let tradeAmount = baseAmount * volumeMultiplierForTrade;
      
      // Apply global volume multiplier
      tradeAmount *= volumeMultiplier;
      
      // Update cumulative volume
      cumulativeVolume += tradeAmount;
      
      // Execute the trade
      const senderKeypair = createKeypairFromSecretKey(sender.secretKey);
      const receiverPublicKey = new PublicKey(receiver.publicKey);
      
      const signature = await transferTokens(
        connection,
        senderKeypair,
        receiverPublicKey,
        tokenMint,
        tradeAmount,
        decimals
      );
      
      // Log trade details
      console.log(`Trade ${i+1}/${totalTrades}: ${isWhaleTrade ? "🐋 Whale" : "👤 Retail"} transferred ${tradeAmount.toFixed(2)} tokens`);
      console.log(`From: ${sender.publicKey.slice(0, 8)}...`);
      console.log(`To: ${receiver.publicKey.slice(0, 8)}...`);
      console.log(`Price: ${price.toFixed(2)}, Volume: ${volumeProfile}`);
      
      if (i % 10 === 0 || phase !== "start") {
        console.log(`Cumulative Volume: ${cumulativeVolume.toFixed(0)}`);
        if (patternType === "obv_trend") {
          console.log(`OBV: ${obvValue.toFixed(0)}`);
        }
      }
      
      // Wait for the next trade interval
      await sleep(tradeIntervalSeconds * 1000);
      
    } catch (error) {
      console.error(`Error in trade ${i+1}:`, error);
      // Continue with next trade
      await sleep(5000); // Wait a bit longer after an error
    }
  }
  
  console.log("\n✅ Volume Pattern Engineering completed");
}

/**
 * Implements Organic Activity Simulation
 * Simulates natural trading with randomized microtransactions, stepping patterns, and resistance breakthroughs
 * @param {Connection} connection - Solana connection
 * @param {Array} accounts - Array of account objects
 * @param {Object} tokenInfo - Token information object
 * @param {Object} options - Pattern options
 * @returns {Promise<void>}
 */
async function organicActivitySimulation(
  connection,
  accounts,
  tokenInfo,
  options = {}
) {
  const {
    durationMinutes = 50,
    tradeIntervalSeconds = 8,
    volumeMultiplier = 1.0,
    simulationType = "mixed", // or "microtransactions", "stepping", "resistance_breakthrough"
  } = options;

  console.log("\n🔄 Starting Organic Activity Simulation");
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Trade Interval: ${tradeIntervalSeconds} seconds`);
  console.log(`Simulation Type: ${simulationType}`);
  
  const tokenMint = new PublicKey(tokenInfo.mint);
  const decimals = tokenInfo.decimals;
  
  // Separate whale and retail accounts
  const whaleAccounts = accounts.filter(account => account.type === "whale");
  const retailAccounts = accounts.filter(account => account.type === "retail");
  
  // Calculate number of trades
  const totalTrades = Math.floor((durationMinutes * 60) / tradeIntervalSeconds);
  
  // Initialize price simulation
  let price = 100; // Arbitrary starting price
  let resistanceLevel = 120; // Initial resistance level
  let supportLevel = 90; // Initial support level
  let currentPattern = simulationType === "mixed" ? "microtransactions" : simulationType;
  let patternDuration = getRandomInt(totalTrades / 10, totalTrades / 5);
  let patternProgress = 0;
  let plateauCounter = 0;
  
  console.log(`\nInitial conditions:`);
  console.log(`Price: ${price}`);
  console.log(`Resistance Level: ${resistanceLevel}`);
  console.log(`Support Level: ${supportLevel}`);
  console.log(`Starting Pattern: ${currentPattern}`);
  
  // Execute trades
  for (let i = 0; i < totalTrades; i++) {
    try {
      // Update pattern progress
      patternProgress++;
      
      // Check if we should switch patterns (for mixed simulation type)
      if (simulationType === "mixed" && patternProgress >= patternDuration) {
        patternProgress = 0;
        patternDuration = getRandomInt(totalTrades / 10, totalTrades / 5);
        
        // Switch to a different pattern
        const patterns = ["microtransactions", "stepping", "resistance_breakthrough"];
        const currentIndex = patterns.indexOf(currentPattern);
        const nextIndex = (currentIndex + 1) % patterns.length;
        currentPattern = patterns[nextIndex];
        
        console.log(`\n${new Date().toISOString()} - Switching to ${currentPattern} pattern`);
        
        // Reset plateau counter when switching patterns
        plateauCounter = 0;
      }
      
      // Update price based on current pattern
      let priceChange = 0;
      let tradeSize = "normal";
      
      if (currentPattern === "microtransactions") {
        // Microtransactions: many small trades with minimal price impact
        priceChange = getRandomNumber(-0.5, 0.5);
        tradeSize = "small";
        
      } else if (currentPattern === "stepping") {
        // Stepping pattern: periods of price stability followed by quick moves
        if (plateauCounter < patternDuration / 3) {
          // Plateau phase
          priceChange = getRandomNumber(-0.2, 0.2);
          plateauCounter++;
        } else {
          // Step phase
          const stepDirection = Math.random() < 0.6 ? 1 : -1; // Bias toward upward steps
          priceChange = stepDirection * getRandomNumber(1.0, 3.0);
          tradeSize = "medium";
          plateauCounter = 0; // Reset plateau counter
          console.log(`\n${new Date().toISOString()} - Price step: ${priceChange > 0 ? 'up' : 'down'} ${Math.abs(priceChange).toFixed(2)}`);
        }
        
      } else if (currentPattern === "resistance_breakthrough") {
        // Resistance breakthrough: test resistance/support, then break through
        const distanceToResistance = resistanceLevel - price;
        const distanceToSupport = price - supportLevel;
        
        if (patternProgress < patternDuration * 0.7) {
          // Testing phase: price moves toward resistance or support
          if (distanceToResistance < distanceToSupport) {
            // Closer to resistance, test it
            priceChange = getRandomNumber(0, Math.min(1.5, distanceToResistance / 2));
          } else {
            // Closer to support, test it
            priceChange = getRandomNumber(Math.max(-1.5, -distanceToSupport / 2), 0);
          }
          
          // Log when price is near resistance/support
          if (Math.abs(price - resistanceLevel) < 2) {
            console.log(`\n${new Date().toISOString()} - Testing resistance at ${resistanceLevel}`);
          } else if (Math.abs(price - supportLevel) < 2) {
            console.log(`\n${new Date().toISOString()} - Testing support at ${supportLevel}`);
          }
          
        } else {
          // Breakthrough phase
          if (distanceToResistance < distanceToSupport) {
            // Break through resistance
            priceChange = getRandomNumber(1.0, 4.0);
            tradeSize = "large";
            
            if (price < resistanceLevel && price + priceChange > resistanceLevel) {
              console.log(`\n${new Date().toISOString()} - Breaking through resistance at ${resistanceLevel}!`);
              // Set new levels after breakthrough
              supportLevel = resistanceLevel;
              resistanceLevel = resistanceLevel * getRandomNumber(1.2, 1.4);
              console.log(`New support: ${supportLevel.toFixed(2)}, New resistance: ${resistanceLevel.toFixed(2)}`);
            }
          } else {
            // Break through support (less common)
            priceChange = getRandomNumber(-4.0, -1.0);
            tradeSize = "large";
            
            if (price > supportLevel && price + priceChange < supportLevel) {
              console.log(`\n${new Date().toISOString()} - Breaking through support at ${supportLevel}!`);
              // Set new levels after breakdown
              resistanceLevel = supportLevel;
              supportLevel = supportLevel * getRandomNumber(0.7, 0.9);
              console.log(`New resistance: ${resistanceLevel.toFixed(2)}, New support: ${supportLevel.toFixed(2)}`);
            }
          }
        }
      }
      
      // Update price
      price += priceChange;
      price = Math.max(1, price); // Ensure price doesn't go negative
      
      // Determine if whale or retail will trade based on pattern
      let isWhaleTrade;
      if (currentPattern === "microtransactions") {
        isWhaleTrade = Math.random() < 0.2; // 20% whale activity
      } else if (currentPattern === "stepping") {
        isWhaleTrade = plateauCounter === 0 ? Math.random() < 0.6 : Math.random() < 0.3;
      } else if (currentPattern === "resistance_breakthrough") {
        // More whale activity during breakthrough
        isWhaleTrade = patternProgress >= patternDuration * 0.7 ? Math.random() < 0.7 : Math.random() < 0.4;
      } else {
        isWhaleTrade = Math.random() < 0.3; // Default
      }
      
      // Select accounts for trade
      let sender, receiver;
      
      // Special logic for resistance breakthrough
      if (currentPattern === "resistance_breakthrough" && patternProgress >= patternDuration * 0.7) {
        if (price > resistanceLevel - 5) {
          // During upward breakthrough, retail buys from whales
          sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        } else if (price < supportLevel + 5) {
          // During downward breakthrough, retail sells to whales
          sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          receiver = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
        } else if (isWhaleTrade) {
          // Normal whale behavior
          sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        } else {
          // Normal retail behavior
          sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          
          // Make sure sender and receiver are different
          while (sender.publicKey === receiver.publicKey) {
            receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          }
        }
      } else {
        // Standard account selection
        if (isWhaleTrade) {
          sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        } else {
          sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          
          // Make sure sender and receiver are different
          while (sender.publicKey === receiver.publicKey) {
            receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          }
        }
      }
      
      // Determine trade amount based on trade size
      let baseAmount;
      if (isWhaleTrade) {
        if (tradeSize === "small") {
          baseAmount = getRandomNumber(5000, 20000);
        } else if (tradeSize === "medium") {
          baseAmount = getRandomNumber(20000, 50000);
        } else if (tradeSize === "large") {
          baseAmount = getRandomNumber(50000, 100000);
        } else { // normal
          baseAmount = getRandomNumber(10000, 70000);
        }
      } else {
        if (tradeSize === "small") {
          baseAmount = getRandomNumber(500, 2000);
        } else if (tradeSize === "medium") {
          baseAmount = getRandomNumber(2000, 5000);
        } else if (tradeSize === "large") {
          baseAmount = getRandomNumber(5000, 10000);
        } else { // normal
          baseAmount = getRandomNumber(1000, 7000);
        }
      }
      
      // Apply global volume multiplier
      let tradeAmount = baseAmount * volumeMultiplier;
      
      // Add some dust amounts occasionally for realism
      if (Math.random() < 0.2) {
        tradeAmount += getRandomNumber(0.01, 0.99);
      }
      
      // Execute the trade
      const senderKeypair = createKeypairFromSecretKey(sender.secretKey);
      const receiverPublicKey = new PublicKey(receiver.publicKey);
      
      const signature = await transferTokens(
        connection,
        senderKeypair,
        receiverPublicKey,
        tokenMint,
        tradeAmount,
        decimals
      );
      
      // Log trade details
      console.log(`Trade ${i+1}/${totalTrades}: ${isWhaleTrade ? "🐋 Whale" : "👤 Retail"} transferred ${tradeAmount.toFixed(2)} tokens`);
      console.log(`From: ${sender.publicKey.slice(0, 8)}...`);
      console.log(`To: ${receiver.publicKey.slice(0, 8)}...`);
      
      if (i % 10 === 0 || tradeSize === "large") {
        console.log(`Price: ${price.toFixed(2)}, Pattern: ${currentPattern}, Size: ${tradeSize}`);
      }
      
      // Wait for the next trade interval
      await sleep(tradeIntervalSeconds * 1000);
      
    } catch (error) {
      console.error(`Error in trade ${i+1}:`, error);
      // Continue with next trade
      await sleep(5000); // Wait a bit longer after an error
    }
  }
  
  console.log("\n✅ Organic Activity Simulation completed");
}

/**
 * Implements a MACD Crossover Signal pattern
 * Simulates price movement based on MACD line crossing the signal line
 * @param {Connection} connection - Solana connection
 * @param {Array} accounts - Array of account objects
 * @param {Object} tokenInfo - Token information object
 * @param {Object} options - Pattern options
 * @returns {Promise<void>}
 */
async function macdCrossoverSignal(
  connection,
  accounts,
  tokenInfo,
  options = {}
) {
  const {
    durationMinutes = 40,
    tradeIntervalSeconds = 15,
    volumeMultiplier = 1.4,
    initialTrend = "bullish", // or "bearish"
  } = options;

  console.log("\n🔄 Starting MACD Crossover Signal Pattern");
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Trade Interval: ${tradeIntervalSeconds} seconds`);
  console.log(`Initial Trend: ${initialTrend}`);
  
  const tokenMint = new PublicKey(tokenInfo.mint);
  const decimals = tokenInfo.decimals;
  
  // Separate whale and retail accounts
  const whaleAccounts = accounts.filter(account => account.type === "whale");
  const retailAccounts = accounts.filter(account => account.type === "retail");
  
  // Calculate number of trades
  const totalTrades = Math.floor((durationMinutes * 60) / tradeIntervalSeconds);
  
  // Initialize MACD parameters
  let price = 100; // Arbitrary starting price
  let macdLine = initialTrend === "bullish" ? 0.5 : -0.5; // MACD line (12-day EMA minus 26-day EMA)
  let signalLine = macdLine * 0.8; // Signal line (9-day EMA of MACD line)
  let histogram = macdLine - signalLine; // MACD histogram
  let trend = initialTrend;
  let momentumStrength = 0.2; // Initial momentum strength
  
  // Track crossovers
  let lastCrossoverDirection = null;
  let tradingSideway = false;
  let divergenceDetected = false;
  
  console.log(`\nInitial conditions:`);
  console.log(`Price: ${price}`);
  console.log(`MACD Line: ${macdLine.toFixed(3)}`);
  console.log(`Signal Line: ${signalLine.toFixed(3)}`);
  console.log(`Histogram: ${histogram.toFixed(3)}`);
  
  // Execute trades
  for (let i = 0; i < totalTrades; i++) {
    try {
      // Update MACD components
      const priceChange = getRandomNumber(-1.5, 1.5);
      
      // Adjust price change based on trend and momentum
      let adjustedPriceChange;
      if (trend === "bullish") {
        adjustedPriceChange = priceChange + momentumStrength;
      } else {
        adjustedPriceChange = priceChange - momentumStrength;
      }
      
      // Update price
      price += adjustedPriceChange;
      price = Math.max(1, price); // Ensure price doesn't go negative
      
      // Update MACD line (faster EMA - slower EMA)
      macdLine = macdLine * 0.9 + adjustedPriceChange * 0.1;
      
      // Update signal line (EMA of MACD line)
      signalLine = signalLine * 0.8 + macdLine * 0.2;
      
      // Calculate histogram
      const previousHistogram = histogram;
      histogram = macdLine - signalLine;
      
      // Check for crossover
      const previousCrossoverDirection = lastCrossoverDirection;
      if (macdLine > signalLine && (lastCrossoverDirection === null || lastCrossoverDirection === "down")) {
        // Bullish crossover (MACD crosses above signal line)
        lastCrossoverDirection = "up";
        trend = "bullish";
        momentumStrength = Math.min(momentumStrength + 0.2, 1.0);
        console.log(`\n${new Date().toISOString()} - 🟢 Bullish MACD Crossover detected!`);
        console.log(`MACD Line: ${macdLine.toFixed(3)}, Signal Line: ${signalLine.toFixed(3)}`);
        console.log(`Histogram: ${histogram.toFixed(3)}`);
      } else if (macdLine < signalLine && (lastCrossoverDirection === null || lastCrossoverDirection === "up")) {
        // Bearish crossover (MACD crosses below signal line)
        lastCrossoverDirection = "down";
        trend = "bearish";
        momentumStrength = Math.min(momentumStrength + 0.2, 1.0);
        console.log(`\n${new Date().toISOString()} - 🔴 Bearish MACD Crossover detected!`);
        console.log(`MACD Line: ${macdLine.toFixed(3)}, Signal Line: ${signalLine.toFixed(3)}`);
        console.log(`Histogram: ${histogram.toFixed(3)}`);
      }
      
      // Check for sideways movement
      if (Math.abs(histogram) < 0.1 && Math.abs(macdLine) < 0.2) {
        if (!tradingSideway) {
          tradingSideway = true;
          console.log(`\n${new Date().toISOString()} - ↔️ MACD indicates sideways trading`);
        }
        momentumStrength = Math.max(momentumStrength - 0.1, 0.1);
      } else {
        tradingSideway = false;
      }
      
      // Check for histogram reversal (potential early signal)
      if (previousHistogram > 0 && histogram < 0) {
        console.log(`\n${new Date().toISOString()} - ⚠️ Histogram flipped negative - potential bearish signal`);
      } else if (previousHistogram < 0 && histogram > 0) {
        console.log(`\n${new Date().toISOString()} - ✅ Histogram flipped positive - potential bullish signal`);
      }
      
      // Determine if whale or retail will trade based on MACD signals
      let isWhaleTrade;
      
      if (lastCrossoverDirection !== previousCrossoverDirection) {
        // Higher whale activity during crossovers
        isWhaleTrade = Math.random() < 0.7;
      } else if (tradingSideway) {
        // Lower whale activity during sideways movement
        isWhaleTrade = Math.random() < 0.2;
      } else {
        // Normal whale activity
        isWhaleTrade = Math.random() < 0.4;
      }
      
      // Select accounts for trade
      let sender, receiver;
      
      if (isWhaleTrade) {
        if (trend === "bullish") {
          // In bullish trend, whales accumulate
          sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          receiver = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
        } else {
          // In bearish trend, whales distribute
          sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      } else {
        // Retail trading with each other
        sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        
        // Make sure sender and receiver are different
        while (sender.publicKey === receiver.publicKey) {
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      }
      
      // Determine trade amount based on MACD signals
      let baseAmount;
      if (isWhaleTrade) {
        baseAmount = getRandomNumber(20000, 100000);
      } else {
        baseAmount = getRandomNumber(2000, 10000);
      }
      
      // Adjust amount based on MACD signals
      let tradeMultiplier = 1.0;
      
      if (lastCrossoverDirection !== previousCrossoverDirection) {
        // Higher volume during crossovers
        tradeMultiplier = 1.5 + Math.abs(histogram) * 2;
      } else if (tradingSideway) {
        // Lower volume during sideways movement
        tradeMultiplier = 0.5;
      } else {
        // Normal volume, slightly adjusted by histogram strength
        tradeMultiplier = 1.0 + Math.abs(histogram);
      }
      
      let tradeAmount = baseAmount * tradeMultiplier;
      
      // Apply global volume multiplier
      tradeAmount *= volumeMultiplier;
      
      // Execute the trade
      const senderKeypair = createKeypairFromSecretKey(sender.secretKey);
      const receiverPublicKey = new PublicKey(receiver.publicKey);
      
      const signature = await transferTokens(
        connection,
        senderKeypair,
        receiverPublicKey,
        tokenMint,
        tradeAmount,
        decimals
      );
      
      // Log trade details
      console.log(`Trade ${i+1}/${totalTrades}: ${isWhaleTrade ? "🐋 Whale" : "👤 Retail"} transferred ${tradeAmount.toFixed(2)} tokens`);
      console.log(`From: ${sender.publicKey.slice(0, 8)}...`);
      console.log(`To: ${receiver.publicKey.slice(0, 8)}...`);
      
      if (i % 10 === 0 || lastCrossoverDirection !== previousCrossoverDirection) {
        console.log(`Price: ${price.toFixed(2)}, MACD: ${macdLine.toFixed(3)}, Signal: ${signalLine.toFixed(3)}`);
      }
      
      // Wait for the next trade interval
      await sleep(tradeIntervalSeconds * 1000);
      
    } catch (error) {
      console.error(`Error in trade ${i+1}:`, error);
      // Continue with next trade
      await sleep(5000); // Wait a bit longer after an error
    }
  }
  
  console.log("\n✅ MACD Crossover Signal Pattern completed");
}

/**
 * Implements an RSI Divergence pattern
 * Simulates price movement based on RSI divergence signals
 * @param {Connection} connection - Solana connection
 * @param {Array} accounts - Array of account objects
 * @param {Object} tokenInfo - Token information object
 * @param {Object} options - Pattern options
 * @returns {Promise<void>}
 */
async function rsiDivergence(
  connection,
  accounts,
  tokenInfo,
  options = {}
) {
  const {
    durationMinutes = 45,
    tradeIntervalSeconds = 15,
    volumeMultiplier = 1.3,
    divergenceType = "bullish", // or "bearish"
  } = options;

  console.log("\n🔄 Starting RSI Divergence Pattern");
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Trade Interval: ${tradeIntervalSeconds} seconds`);
  console.log(`Divergence Type: ${divergenceType}`);
  
  const tokenMint = new PublicKey(tokenInfo.mint);
  const decimals = tokenInfo.decimals;
  
  // Separate whale and retail accounts
  const whaleAccounts = accounts.filter(account => account.type === "whale");
  const retailAccounts = accounts.filter(account => account.type === "retail");
  
  // Calculate number of trades
  const totalTrades = Math.floor((durationMinutes * 60) / tradeIntervalSeconds);
  
  // Initialize RSI parameters
  let price = 100; // Arbitrary starting price
  let rsi = 50; // Initial RSI value (neutral)
  let gains = 0;
  let losses = 0;
  let phase = "setup"; // setup -> divergence -> resolution
  let phaseProgress = 0;
  
  // Price and RSI history for divergence detection
  const priceHistory = [];
  const rsiHistory = [];
  let divergenceDetected = false;
  let divergenceConfirmed = false;
  
  console.log(`\nInitial conditions:`);
  console.log(`Price: ${price}`);
  console.log(`RSI: ${rsi}`);
  console.log(`Phase: ${phase}`);
  
  // Execute trades
  for (let i = 0; i < totalTrades; i++) {
    try {
      // Update phase progress
      phaseProgress += 1 / (totalTrades / 3); // Complete each phase in 1/3 of total trades
      
      // Check if we should move to next phase
      if (phaseProgress >= 1) {
        phaseProgress = 0;
        if (phase === "setup") {
          phase = "divergence";
          console.log(`\n${new Date().toISOString()} - Entered divergence phase`);
        } else if (phase === "divergence") {
          phase = "resolution";
          divergenceConfirmed = true;
          console.log(`\n${new Date().toISOString()} - Entered resolution phase`);
          console.log(`${divergenceType.toUpperCase()} RSI Divergence confirmed!`);
        }
      }
      
      // Determine price change based on current phase and divergence type
      let priceChange;
      
      if (phase === "setup") {
        if (divergenceType === "bullish") {
          // For bullish divergence setup: price making lower lows
          priceChange = getRandomNumber(-2.0, 0.5);
        } else {
          // For bearish divergence setup: price making higher highs
          priceChange = getRandomNumber(-0.5, 2.0);
        }
      } else if (phase === "divergence") {
        if (divergenceType === "bullish") {
          // For bullish divergence: price makes a lower low but RSI makes a higher low
          if (phaseProgress < 0.5) {
            priceChange = getRandomNumber(-2.0, -0.5); // Price continues down
          } else {
            priceChange = getRandomNumber(-0.5, 1.0); // Price starts to stabilize
            if (!divergenceDetected && priceChange > 0) {
              divergenceDetected = true;
              console.log(`\n${new Date().toISOString()} - Potential bullish RSI divergence detected`);
            }
          }
        } else {
          // For bearish divergence: price makes a higher high but RSI makes a lower high
          if (phaseProgress < 0.5) {
            priceChange = getRandomNumber(0.5, 2.0); // Price continues up
          } else {
            priceChange = getRandomNumber(-1.0, 0.5); // Price starts to stabilize
            if (!divergenceDetected && priceChange < 0) {
              divergenceDetected = true;
              console.log(`\n${new Date().toISOString()} - Potential bearish RSI divergence detected`);
            }
          }
        }
      } else { // resolution phase
        if (divergenceType === "bullish") {
          // For bullish divergence resolution: price reverses upward
          priceChange = getRandomNumber(0.5, 3.0);
        } else {
          // For bearish divergence resolution: price reverses downward
          priceChange = getRandomNumber(-3.0, -0.5);
        }
      }
      
      // Update price
      price += priceChange;
      price = Math.max(1, price); // Ensure price doesn't go negative
      
      // Store price history
      priceHistory.push(price);
      if (priceHistory.length > 14) {
        priceHistory.shift(); // Keep only last 14 periods
      }
      
      // Calculate RSI
      if (priceChange > 0) {
        gains = (gains * 13 + priceChange) / 14;
        losses = (losses * 13) / 14;
      } else {
        gains = (gains * 13) / 14;
        losses = (losses * 13 - priceChange) / 14;
      }
      
      // Handle division by zero
      const rs = losses === 0 ? 100 : gains / losses;
      
      // Calculate new RSI
      let newRsi = 100 - (100 / (1 + rs));
      
      // Manipulate RSI for divergence
      if (phase === "divergence") {
        if (divergenceType === "bullish") {
          // For bullish divergence: RSI should make higher lows while price makes lower lows
          if (phaseProgress > 0.5 && price < Math.min(...priceHistory.slice(0, -1))) {
            // If price made a new low, ensure RSI doesn't make a new low
            newRsi = Math.max(newRsi, rsi + getRandomNumber(1, 5));
          }
        } else {
          // For bearish divergence: RSI should make lower highs while price makes higher highs
          if (phaseProgress > 0.5 && price > Math.max(...priceHistory.slice(0, -1))) {
            // If price made a new high, ensure RSI doesn't make a new high
            newRsi = Math.min(newRsi, rsi - getRandomNumber(1, 5));
          }
        }
      }
      
      // Ensure RSI stays within 0-100 range
      rsi = Math.max(0, Math.min(100, newRsi));
      
      // Store RSI history
      rsiHistory.push(rsi);
      if (rsiHistory.length > 14) {
        rsiHistory.shift(); // Keep only last 14 periods
      }
      
      // Determine if whale or retail will trade based on RSI and phase
      let isWhaleTrade;
      
      if (phase === "setup") {
        // Normal trading during setup
        isWhaleTrade = Math.random() < 0.4;
      } else if (phase === "divergence") {
        if (divergenceType === "bullish") {
          // During bullish divergence, whales start accumulating
          isWhaleTrade = Math.random() < (0.3 + phaseProgress * 0.4);
        } else {
          // During bearish divergence, whales start distributing
          isWhaleTrade = Math.random() < (0.3 + phaseProgress * 0.4);
        }
      } else { // resolution phase
        // High whale activity during resolution
        isWhaleTrade = Math.random() < 0.7;
      }
      
      // Select accounts for trade
      let sender, receiver;
      
      if (isWhaleTrade) {
        if ((divergenceType === "bullish" && phase !== "setup") || 
            (divergenceType === "bearish" && phase === "setup")) {
          // Whales buying
          sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
          receiver = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
        } else {
          // Whales selling
          sender = whaleAccounts[getRandomInt(0, whaleAccounts.length - 1)];
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      } else {
        // Retail trading with each other
        sender = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        
        // Make sure sender and receiver are different
        while (sender.publicKey === receiver.publicKey) {
          receiver = retailAccounts[getRandomInt(0, retailAccounts.length - 1)];
        }
      }
      
      // Determine trade amount based on RSI and phase
      let baseAmount;
      if (isWhaleTrade) {
        baseAmount = getRandomNumber(15000, 80000);
      } else {
        baseAmount = getRandomNumber(1500, 8000);
      }
      
      // Adjust amount based on RSI extremes and divergence
      let tradeMultiplier = 1.0;
      
      if (rsi < 30 || rsi > 70) {
        // Higher volume during extreme RSI values
        tradeMultiplier = 1.5;
      }
      
      if (divergenceDetected) {
        // Higher volume after divergence is detected
        tradeMultiplier *= 1.3;
      }
      
      if (divergenceConfirmed) {
        // Much higher volume after divergence is confirmed
        tradeMultiplier *= 1.8;
      }
      
      let tradeAmount = baseAmount * tradeMultiplier;
      
      // Apply global volume multiplier
      tradeAmount *= volumeMultiplier;
      
      // Execute the trade
      const senderKeypair = createKeypairFromSecretKey(sender.secretKey);
      const receiverPublicKey = new PublicKey(receiver.publicKey);
      
      const signature = await transferTokens(
        connection,
        senderKeypair,
        receiverPublicKey,
        tokenMint,
        tradeAmount,
        decimals
      );
      
      // Log trade details
      console.log(`Trade ${i+1}/${totalTrades}: ${isWhaleTrade ? "🐋 Whale" : "👤 Retail"} transferred ${tradeAmount.toFixed(2)} tokens`);
      console.log(`From: ${sender.publicKey.slice(0, 8)}...`);
      console.log(`To: ${receiver.publicKey.slice(0, 8)}...`);
      
      if (i % 10 === 0 || divergenceDetected || divergenceConfirmed) {
        console.log(`Price: ${price.toFixed(2)}, RSI: ${rsi.toFixed(1)}, Phase: ${phase}`);
      }
      
      // Wait for the next trade interval
      await sleep(tradeIntervalSeconds * 1000);
      
    } catch (error) {
      console.error(`Error in trade ${i+1}:`, error);
      // Continue with next trade
      await sleep(5000); // Wait a bit longer after an error
    }
  }
  
  console.log("\n✅ RSI Divergence Pattern completed");
}

// Export the pattern functions
export {
  movingAverageCrossover,
  fibonacciRetracement,
  bollingerBandSqueeze,
  volumePatternEngineering,
  organicActivitySimulation,
  macdCrossoverSignal,
  rsiDivergence,
  loadAccounts,
  loadTokenInfo
}; 