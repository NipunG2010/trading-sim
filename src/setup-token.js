#!/usr/bin/env node

const fs = require('fs');
const { setupTokenConfig } = require('./token-config');

// Default token configuration
const defaultConfig = {
  "mint": "" // Your token address here
};

/**
 * Setup token configuration
 */
async function setupToken() {
  try {
    console.log("\n🚀 Setting up token configuration...");

    // Check if token-config.json exists
    let config = defaultConfig;
    if (fs.existsSync('token-config.json')) {
      console.log('\n📝 Found token-config.json, loading configuration...');
      config = JSON.parse(fs.readFileSync('token-config.json', 'utf8'));
    } else {
      console.log('\n⚠️ No token-config.json found, creating template...');
      fs.writeFileSync('token-config.json', JSON.stringify(defaultConfig, null, 2));
      console.log('\n❌ Please update token-config.json with your token address and run this script again.');
      console.log('Required:');
      console.log('- mint: Your token address');
      process.exit(1);
    }

    // Setup token configuration
    if (setupTokenConfig(config)) {
      console.log('\n✅ Token setup completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Start the trading simulation');
    }

  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  }
}

setupToken().catch(console.error); 