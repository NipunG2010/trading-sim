const { TradingService } = require('./services/tradingService');
const fs = require('fs');

async function stopTrading() {
  try {
    // Read token info
    const tokenInfo = JSON.parse(fs.readFileSync('./public/token-info.json'));
    const tradingService = new TradingService(null, tokenInfo.mint);
    
    console.log('\n🛑 Stopping trading pattern...');
    await tradingService.stopTrading();
    console.log('✅ Trading stopped successfully\n');
  } catch (error) {
    console.error('❌ Error stopping trading:', error.message);
  }
}

stopTrading(); 