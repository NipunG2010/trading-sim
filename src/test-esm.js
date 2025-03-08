// src/test-esm.js
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function testConnection() {
  try {
    const slot = await connection.getSlot();
    console.log(`Connected to Solana devnet at slot: ${slot}`);
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

// Run the test
testConnection().catch(error => console.error("Error:", error)); 