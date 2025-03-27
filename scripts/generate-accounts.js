const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');

// Generate 50 Solana keypairs (both public and private keys)
function generateAccounts() {
  const accounts = [];
  
  for (let i = 0; i < 50; i++) {
    const keypair = Keypair.generate();
    accounts.push({
      index: i + 1,
      publicKey: keypair.publicKey.toString(),
      privateKey: Array.from(keypair.secretKey) // Store as array of bytes
    });
  }

  return accounts;
}

// Generate and save accounts
function main() {
  try {
    const accounts = generateAccounts();
    const outputPath = path.join(__dirname, '../accounts.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(accounts, null, 2));
    console.log(`Successfully generated ${accounts.length} accounts with complete key pairs`);
    console.log(`Saved to: ${outputPath}`);
  } catch (error) {
    console.error('Failed to generate accounts:', error);
    process.exit(1);
  }
}

main();