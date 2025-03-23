const fs = require('fs');

/**
 * Validates token configuration data
 * @param {Object} config Token configuration object
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateTokenConfig(config) {
  if (!config.mint) {
    throw new Error('Token address (mint) is required');
  }
  return true;
}

/**
 * Saves token configuration to files
 * @param {Object} config Token configuration object
 */
function saveTokenConfig(config) {
  // Create token info object
  const tokenInfo = {
    mint: config.mint
  };

  // Ensure public directory exists
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
  }

  // Save files
  fs.writeFileSync('token-info.json', JSON.stringify(tokenInfo, null, 2));
  fs.writeFileSync('public/token-info.json', JSON.stringify(tokenInfo, null, 2));

  console.log('\n✅ Token configuration saved successfully!');
  console.log('\n📝 Token information:');
  console.log(`Token Address: ${tokenInfo.mint}`);
}

/**
 * Sets up token configuration from provided data
 * @param {Object} config Token configuration object
 */
function setupTokenConfig(config) {
  try {
    // Validate configuration
    validateTokenConfig(config);

    // Save configuration
    saveTokenConfig(config);

    return true;
  } catch (error) {
    console.error(`\n❌ Error setting up token configuration: ${error.message}`);
    return false;
  }
}

module.exports = {
  setupTokenConfig
}; 