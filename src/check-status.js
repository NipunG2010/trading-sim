const { TradingService } = require('./services/tradingService');
const fs = require('fs');

async function checkStatus() {
  try {
    // Read token info
    const tokenInfo = JSON.parse(fs.readFileSync('./public/token-info.json', 'utf-8'));
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
    const tradingService = new TradingService(connection, tokenInfo.mint);
    
    const status = await tradingService.getTradingStatus();
    
    console.log('\n🔍 Trading Status:');
    console.log('---------------------------------------------------------');
    
    if (status.isRunning) {
      const remainingTime = status.remainingTime ? Math.floor(status.remainingTime / 1000) : 0;
      const elapsed = status.totalDuration ? Math.floor((status.totalDuration - status.remainingTime) / 1000) : 0;
      const progress = status.totalDuration ? ((elapsed / (status.totalDuration / 1000)) * 100).toFixed(1) : 0;
      
      console.log('Status: 🟢 Running');
      console.log(`Pattern: ${status.currentPattern}`);
      console.log(`Time Remaining: ${Math.floor(remainingTime / 60)}m ${remainingTime % 60}s`);
      console.log(`Progress: ${progress}%`);
    } else {
      console.log('Status: ⚪ Stopped');
      console.log('No active trading pattern');
    }
    
    console.log('---------------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

checkStatus(); 