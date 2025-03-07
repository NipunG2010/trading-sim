// src/fund-accounts.ts
import * as fs from "fs";

/**
 * Prints public keys for manual devnet funding.
 */
function printPublicKeys() {
  const accountData = JSON.parse(fs.readFileSync("../accounts.json", "utf-8"));
  accountData.forEach((account: any) => {
    console.log(`solana airdrop 0.1 ${account.publicKey} --url https://api.devnet.solana.com`);
  });
}

printPublicKeys();