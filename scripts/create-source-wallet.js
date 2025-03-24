const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

function createSourceWallet() {
    try {
        // Generate new keypair
        const sourceWallet = Keypair.generate();
        
        // Convert secretKey to regular array and save as JSON
        const secretKeyArray = Array.from(sourceWallet.secretKey);
        fs.writeFileSync(
            path.join(process.cwd(), 'source-wallet.json'),
            JSON.stringify(secretKeyArray, null, 2)
        );
        
        console.log('Source wallet created successfully!');
        console.log('Public Key:', sourceWallet.publicKey.toString());
        console.log('Secret key saved as array of numbers in source-wallet.json');
        
        return true;
    } catch (error) {
        console.error('Error creating source wallet:', error);
        return false;
    }
}

// Execute if running directly
if (require.main === module) {
    createSourceWallet();
}

module.exports = { createSourceWallet }; 