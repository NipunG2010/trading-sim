// @ts-nocheck
/**
 * Trading patterns facade - provides clean interface to all pattern implementations
 */

// Import pattern implementations
import MovingAverageCrossover from './trading/patterns/MovingAverageCrossover';
import FibonacciRetracement from './trading/patterns/FibonacciRetracement';

// Import types from token service
import type { Account, TokenInfo } from '../services/tokenService';

interface PatternOptions {
  durationMinutes?: number;
  tradeIntervalSeconds?: number;
  volumeMultiplier?: number;
  whaleParticipation?: number;
  initialTrend?: 'bullish' | 'bearish';
}

export async function movingAverageCrossover(
  connection: any,
  accounts: Account[],
  tokenInfo: TokenInfo,
  options: PatternOptions = {}
): Promise<void> {
  const pattern = new MovingAverageCrossover(connection, accounts, tokenInfo, options);
  return pattern.execute();
}

export async function fibonacciRetracement(
  connection: any, 
  accounts: Account[],
  tokenInfo: TokenInfo,
  options: PatternOptions = {}
): Promise<void> {
  const pattern = new FibonacciRetracement(connection, accounts, tokenInfo, options);
  return pattern.execute();
}

export default {
  movingAverageCrossover,
  fibonacciRetracement
};