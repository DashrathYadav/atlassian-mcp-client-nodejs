/**
 * Logging utilities for Atlassian MCP Client
 */

import winston from 'winston';
import type { ApplicationConfig } from '../config/atlassian-config.js';

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error | any): void;
}

/**
 * Create a winston logger instance
 */
export function createLogger(config: ApplicationConfig): Logger {
  const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'atlassian-mcp-client' },
    transports: [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log' 
      })
    ]
  });

  // In development, also log to console with a nice format
  if (config.nodeEnv !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      )
    }));
  }

  return {
    debug: (message: string, meta?: any) => logger.debug(message, meta),
    info: (message: string, meta?: any) => logger.info(message, meta),
    warn: (message: string, meta?: any) => logger.warn(message, meta),
    error: (message: string, error?: Error | any) => {
      if (error instanceof Error) {
        logger.error(message, { error: error.message, stack: error.stack });
      } else {
        logger.error(message, { error });
      }
    }
  };
}

/**
 * Simple console logger for cases where winston isn't available
 */
export function createConsoleLogger(level: 'debug' | 'info' | 'warn' | 'error' = 'info'): Logger {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level];

  const log = (logLevel: keyof typeof levels, message: string, meta?: any) => {
    if (levels[logLevel] >= currentLevel) {
      const timestamp = new Date().toISOString();
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      console[logLevel === 'debug' ? 'log' : logLevel](`${timestamp} [${logLevel.toUpperCase()}]: ${message}${metaStr}`);
    }
  };

  return {
    debug: (message: string, meta?: any) => log('debug', message, meta),
    info: (message: string, meta?: any) => log('info', message, meta),
    warn: (message: string, meta?: any) => log('warn', message, meta),
    error: (message: string, error?: Error | any) => {
      if (error instanceof Error) {
        log('error', message, { error: error.message, stack: error.stack });
      } else {
        log('error', message, { error });
      }
    }
  };
}
