// src/simple-solana-test.js
import { Connection } from '@solana/web3.js';

// Connect to Solana devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Test connection
async function testConnection() {
  try {
    const version = await connection.getVersion();
    console.log('Connection to Solana devnet successful!');
    console.log('Solana version:', version);
    
    const slot = await connection.getSlot();
    console.log('Current slot:', slot);
    
    return true;
  } catch (error) {
    console.error('Error connecting to Solana devnet:', error);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('Test completed successfully!');
    } else {
      console.log('Test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 