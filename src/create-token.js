// src/create-token.js
import { Connection } from "@solana/web3.js";
import { setupToken } from "./token-creation.js";

// Connect to Solana devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Run the token setup
console.log("Starting token creation and distribution process...");
setupToken(connection)
  .then(() => {
    console.log("Token creation and distribution completed successfully!");
  })
  .catch(error => {
    console.error("Error in token setup:", error);
  }); 