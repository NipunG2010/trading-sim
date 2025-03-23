export const calculateTradingConstants = (metrics: {
  totalFunding: number,
  marketCap: number,
  liquidity: number,
  averageBalance: number
}) => ({
  // Liquidity Management - based on total funding and liquidity
  LIQUIDITY: {
    INITIAL_AMOUNT_SOL: Math.min(metrics.totalFunding * 0.35, metrics.liquidity * 0.5), // 35% of funding or 50% of current liquidity
    REMOVAL_THRESHOLD_PERCENT: Math.min(30, metrics.liquidity / metrics.totalFunding * 100), // Dynamic based on liquidity ratio
    REMOVAL_AMOUNT_PERCENT: Math.min(20, metrics.liquidity / metrics.marketCap * 100), // Dynamic based on liquidity/mcap ratio
    DIP_THRESHOLD_PERCENT: Math.max(5, metrics.liquidity / metrics.marketCap * 10), // Dynamic based on liquidity depth
    DIP_ADD_AMOUNT_PERCENT: Math.min(15, metrics.totalFunding / metrics.marketCap * 100), // Dynamic based on funding ratio
  },

  // Volume Pattern - based on liquidity and market cap
  VOLUME: {
    INITIAL_DAILY_SOL: Math.min(metrics.liquidity * 0.05, metrics.averageBalance * 0.5), // 5% of liquidity or 50% of avg balance
    GROWTH_PERCENT: Math.min(30, metrics.liquidity / metrics.marketCap * 200), // Dynamic based on liquidity depth
    GROWTH_DURATION_HOURS: Math.max(2, Math.min(6, metrics.marketCap / metrics.liquidity)), // 2-6 hours based on mcap/liquidity ratio
    BUY_SELL_RATIO: {
      BUY: Math.min(85, 60 + (metrics.liquidity / metrics.marketCap * 100)), // Dynamic based on liquidity ratio
      SELL: Math.max(15, 40 - (metrics.liquidity / metrics.marketCap * 100)), // Complement of BUY
    },
  },

  // Price Action - based on market metrics
  PRICE: {
    STAIR_STEPS: {
      UP_PERCENT: Math.min(15, metrics.liquidity / metrics.marketCap * 150), // Dynamic based on liquidity depth
      DOWN_PERCENT: Math.max(3, metrics.liquidity / metrics.marketCap * 50), // Dynamic retracement
      CYCLES: Math.min(6, metrics.totalFunding / metrics.liquidity), // Dynamic based on funding ratio
    },
    GOLDEN_RATIO: 0.618, // Fibonacci constant
    TARGET_INCREASE_PERCENT: Math.min(100, metrics.totalFunding / metrics.marketCap * 300), // Dynamic based on funding
  },

  // Technical Indicators - mostly fixed as they're standard technical analysis values
  TECHNICAL: {
    RSI: {
      TARGET_MIN: 65,
      TARGET_MAX: 70,
      ABSOLUTE_MAX: 75,
    },
    MOVING_AVERAGES: {
      PRICE_ABOVE_20MA_PERCENT: Math.min(10, metrics.liquidity / metrics.marketCap * 100),
      MA_PERIODS: {
        SHORT: 20,
        LONG: 50,
      },
    },
    MACD: {
      CROSSOVER_INTERVAL_HOURS: Math.max(6, Math.min(12, metrics.marketCap / metrics.liquidity)),
      VOLUME_INCREASE_BEFORE_HOURS: Math.max(1, Math.min(3, metrics.liquidity / metrics.totalFunding)),
      ACTIVE_WALLETS: Math.max(3, Math.min(7, metrics.totalFunding / metrics.averageBalance * 0.1)),
    },
  },

  // Trading Windows (UTC) - fixed as they're based on market hours
  TIME_WINDOWS: {
    PEAK_WINDOWS: [
      {
        name: 'Primary',
        start: 12,
        end: 16,
        volumePercent: 40,
      },
      {
        name: 'Secondary',
        start: 20,
        end: 24,
        volumePercent: 30,
      },
    ],
    OTHER_HOURS_PERCENT: 30,
  },

  // Safety Limits - based on metrics
  SAFETY: {
    MAX_SLIPPAGE_PERCENT: Math.max(0.5, Math.min(2, metrics.liquidity / metrics.marketCap * 20)),
    MIN_LIQUIDITY_SOL: Math.max(20, metrics.totalFunding * 0.1), // 10% of total funding
    MAX_SINGLE_TRADE_SOL: Math.min(metrics.liquidity * 0.01, metrics.averageBalance * 0.2), // 1% of liquidity or 20% of avg balance
    MIN_TIME_BETWEEN_TRADES_MS: 2000, // Fixed for Solana's block time
  },
}); 