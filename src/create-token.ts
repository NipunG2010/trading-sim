import { Connection } from "@solana/web3.js";
import { setupToken } from "./token-creation";

// Connect to Solana devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Run the token creation and distribution process
setupToken(connection)
  .then(() => {
    console.log("Token creation and distribution completed successfully!");
  })
  .catch((error: Error) => {
    console.error("Error in token setup:", error);
  }); 