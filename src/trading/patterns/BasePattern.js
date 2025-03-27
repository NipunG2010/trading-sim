// @ts-nocheck
/**
 * Base class for all trading patterns
 */
class BasePattern {
  /**
   * Create a new pattern instance
   * @param {object} connection - Solana connection
   * @param {Array} accounts - Array of account objects
   * @param {object} tokenInfo - Token information
   * @param {object} [options] - Pattern options
   */
  constructor(connection, accounts, tokenInfo, options = {}) {
    this.connection = connection;
    this.accounts = accounts;
    this.tokenInfo = tokenInfo;
    this.options = options;
  }

  /**
   * Execute the pattern
   * @returns {Promise<void>}
   */
  async execute() {
    throw new Error('Not implemented');
  }
}

module.exports = BasePattern;