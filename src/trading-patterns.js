// @ts-nocheck
const MovingAverageCrossover = require('./trading/patterns/MovingAverageCrossover');
const FibonacciRetracement = require('./trading/patterns/FibonacciRetracement');

/**
 * @typedef {import('./services/tokenService').Account} Account
 * @typedef {import('./services/tokenService').TokenInfo} TokenInfo
 * @typedef {Object} PatternOptions
 * @property {number} [durationMinutes]
 * @property {number} [tradeIntervalSeconds]
 * @property {number} [volumeMultiplier]
 * @property {number} [whaleParticipation]
 * @property {string} [initialTrend]
 */

module.exports = {
  /**
   * Execute moving average crossover pattern
   * @param {Object} connection - Solana connection
   * @param {Account[]} accounts - Array of accounts
   * @param {TokenInfo} tokenInfo - Token information
   * @param {PatternOptions} [options] - Pattern options
   * @returns {Promise<void>}
   */
  movingAverageCrossover: async (connection, accounts, tokenInfo, options) => {
    const pattern = new MovingAverageCrossover.default(connection, accounts, tokenInfo, options);
    return pattern.execute();
  },

  /**
   * Execute fibonacci retracement pattern
   * @param {Object} connection - Solana connection
   * @param {Account[]} accounts - Array of accounts
   * @param {TokenInfo} tokenInfo - Token information
   * @param {PatternOptions} [options] - Pattern options
   * @returns {Promise<void>}
   */
  fibonacciRetracement: async (connection, accounts, tokenInfo, options) => {
    const pattern = new FibonacciRetracement.default(connection, accounts, tokenInfo, options);
    return pattern.execute();
  }
};