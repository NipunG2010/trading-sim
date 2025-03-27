type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  module?: string;
  level?: LogLevel;
}

class Logger {
  private module: string;
  private level: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.module = options.module || 'default';
    this.level = options.level || 'info';
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message}${metaString}`;
  }

  info(message: string, meta?: Record<string, any>) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, any>) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: Record<string, any>) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  child(options: LoggerOptions): Logger {
    return new Logger({
      module: options.module || this.module,
      level: options.level || this.level
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
}

export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info'
}); 