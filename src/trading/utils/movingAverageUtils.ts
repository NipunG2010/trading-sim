/**
 * Calculate new moving average value with randomness
 * @param {number} currentMA - Current moving average value
 * @param {number} volatility - How much the MA can change
 * @param {number} bias - Directional drift (positive/negative)
 * @returns {number}
 */
export function calculateNewMA(currentMA: number, volatility: number = 1, bias: number = 0): number {
  const change = (Math.random() * volatility * 2 - volatility) + bias;
  return currentMA + change;
}

/** 
 * Detect trend from moving averages
 * @param {number} shortMA - Short period MA
 * @param {number} longMA - Long period MA 
 * @returns {{trend: 'up'|'down'|'neutral', strength: number}}
 */
export function detectTrend(shortMA: number, longMA: number, threshold: number = 0.02) {
  const ratio = shortMA / longMA;
  
  if (Math.abs(ratio - 1) > threshold) {
    return {
      trend: ratio > 1 ? 'up' : 'down',
      strength: Math.abs(ratio - 1) / threshold
    };
  }
  
  return { trend: 'neutral', strength: 0 };
}

/**
 * Generate realistic moving average data points
 * @param {object} params
 * @param {number} params.initialValue - Starting price
 * @param {number} params.volatility - Price volatility
 * @param {number} params.trendBias - Up/down bias (-1 to 1)
 * @param {number} params.count - Number of points to generate
 * @returns {number[]}
 */
export function generateMADataPoints({
  initialValue = 100,
  volatility = 1,
  trendBias = 0,
  count = 100
}) {
  const points = [initialValue];
  
  for (let i = 1; i < count; i++) {
    points.push(calculateNewMA(points[i-1], volatility, trendBias));
  }
  
  return points;
}