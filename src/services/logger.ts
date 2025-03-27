import winston from 'winston';
import path from 'path';
import config from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  stack?: string;
}

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }: LogEntry) => {
  if (stack) {
    return `${timestamp} ${level}: ${message}\n${stack}`;
  }
  return `${timestamp} ${level}: ${message}`;
});

// Create logs directory if it doesn't exist
const logDir = path.dirname(config.logging.filePath);
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create Winston logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    logFormat
  ),
  transports: [
    // Write logs to file
    new winston.transports.File({
      filename: config.logging.filePath,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
    // Write errors to separate file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Add console output in development
if (config.validation.isDevelopment) {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        logFormat
      ),
    })
  );
}

// Create namespaced logger function
export const createLogger = (namespace: string) => {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logger.info(`[${namespace}] ${message}`, meta);
    },
    error: (message: string, error?: Error | unknown) => {
      if (error instanceof Error) {
        logger.error(`[${namespace}] ${message}`, {
          error: error.message,
          stack: error.stack,
        });
      } else {
        logger.error(`[${namespace}] ${message}`, { error });
      }
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      logger.warn(`[${namespace}] ${message}`, meta);
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      logger.debug(`[${namespace}] ${message}`, meta);
    },
  };
};

// Export default logger instance
export default logger; 