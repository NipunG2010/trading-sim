const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');

function formatSourceWallet() {
  try {
    const walletPath = path.join(__dirname, '../source-wallet.json');
    const rawBytes = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    // Convert raw bytes to Uint8Array
    const privateKey = Uint8Array.from(rawBytes);
    const keypair = Keypair.fromSecretKey(privateKey);
    
    // Create properly formatted wallet
    const formattedWallet = {
      publicKey: keypair.publicKey.toString(),
      privateKey: Array.from(keypair.secretKey) // Store as array for JSON
    };
    
    // Save back to file
    fs.writeFileSync(walletPath, JSON.stringify(formattedWallet, null, 2));
    console.log('Successfully formatted source wallet');
    console.log(`Public Key: ${formattedWallet.publicKey}`);
  } catch (error) {
    console.error('Error formatting source wallet:', error);
    process.exit(1);
  }
}

formatSourceWallet();