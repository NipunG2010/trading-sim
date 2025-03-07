// src/test-accounts.ts
import * as fs from "fs";
import { Keypair, PublicKey } from "@solana/web3.js";

/**
 * Loads and verifies the 50 accounts from accounts.json.
 */
function testAccounts() {
  const accountData = JSON.parse(fs.readFileSync("../accounts.json", "utf-8"));
  if (accountData.length !== 50) {
    throw new Error(`Expected 50 accounts, found ${accountData.length}`);
  }

  accountData.forEach((account: any, index: number) => {
    const keypair = Keypair.fromSecretKey(Buffer.from(account.secretKey, "base64"));
    if (keypair.publicKey.toString() !== account.publicKey) {
      throw new Error(`Mismatch at account ${index + 1}`);
    }
    console.log(`Verified account ${index + 1}: ${keypair.publicKey.toString()}`);
  });
  console.log("All 50 accounts verified successfully");
}

testAccounts();