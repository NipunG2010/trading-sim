import winston, { Logger } from 'winston';
import { TradingError } from '../trading/types/TradingPatternTypes';
import { mkdirSync } from 'fs';

interface LogMetadata extends winston.Logform.TransformableInfo {
  level: string;
  message: string;
  timestamp: string;
  error?: TradingError;
  tradeId?: string;
  [key: string]: unknown;
}

// Custom format for trading-specific logs
const tradingFormat = winston.format.printf((info) => {
  const { level, message, timestamp, ...metadata } = info as LogMetadata;
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (metadata.error) {
    const error = metadata.error as TradingError;
    msg += `\nError Code: ${error.code}`;
    msg += `\nPattern Type: ${error.patternType || 'N/A'}`;
    if (error.details) {
      msg += `\nDetails: ${JSON.stringify(error.details, null, 2)}`;
    }
  }
  
  if (metadata.tradeId) {
    msg += `\nTrade ID: ${metadata.tradeId}`;
  }
  
  return msg;
});

// Create logger instance
export const logger: Logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    tradingFormat
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add stream for Morgan HTTP request logging
export const httpLogStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Error logging helper
export const logError = (error: TradingError): void => {
  logger.error('Trading error occurred', {
    error,
    timestamp: new Date().toISOString()
  });
};

// Trade logging helper
export const logTrade = (tradeId: string, details: Record<string, unknown>): void => {
  logger.info('Trade executed', {
    tradeId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Pattern state logging helper
export const logPatternState = (
  patternType: string,
  state: string,
  details: Record<string, unknown>
): void => {
  logger.info(`Pattern ${patternType} ${state}`, {
    details,
    timestamp: new Date().toISOString()
  });
};

// Performance logging helper
export const logPerformance = (
  operation: string,
  durationMs: number,
  details: Record<string, unknown>
): void => {
  logger.debug(`Performance: ${operation}`, {
    durationMs,
    details,
    timestamp: new Date().toISOString()
  });
};

// Ensure error directory exists
try {
  mkdirSync('logs', { recursive: true });
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to create logs directory:', error.message);
  } else {
    console.error('Failed to create logs directory:', error);
  }
} 