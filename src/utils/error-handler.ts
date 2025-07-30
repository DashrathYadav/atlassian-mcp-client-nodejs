/**
 * Error handling utilities for Atlassian MCP Client
 */

import type { Logger } from './logger.js';

/**
 * Base error class for Atlassian MCP Client
 */
export class AtlassianMCPError extends Error {
  public readonly code: string;
  public readonly statusCode: number | undefined;
  public readonly originalError: Error | undefined;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AtlassianMCPError';
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AtlassianMCPError);
    }
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends AtlassianMCPError {
  constructor(message: string, originalError?: Error) {
    super(message, 'AUTHENTICATION_ERROR', 401, originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization related errors
 */
export class AuthorizationError extends AtlassianMCPError {
  constructor(message: string, originalError?: Error) {
    super(message, 'AUTHORIZATION_ERROR', 403, originalError);
    this.name = 'AuthorizationError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AtlassianMCPError {
  public readonly retryAfter: number | undefined;

  constructor(message: string, retryAfter?: number, originalError?: Error) {
    super(message, 'RATE_LIMIT_ERROR', 429, originalError);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Network/Connection related errors
 */
export class ConnectionError extends AtlassianMCPError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', 0, originalError);
    this.name = 'ConnectionError';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AtlassianMCPError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONFIGURATION_ERROR', 0, originalError);
    this.name = 'ConfigurationError';
  }
}

/**
 * Jira API specific errors
 */
export class JiraError extends AtlassianMCPError {
  constructor(message: string, statusCode?: number, originalError?: Error) {
    super(message, 'JIRA_ERROR', statusCode, originalError);
    this.name = 'JiraError';
  }
}

/**
 * Confluence API specific errors
 */
export class ConfluenceError extends AtlassianMCPError {
  constructor(message: string, statusCode?: number, originalError?: Error) {
    super(message, 'CONFLUENCE_ERROR', statusCode, originalError);
    this.name = 'ConfluenceError';
  }
}

/**
 * Error handler that logs and optionally transforms errors
 */
export class ErrorHandler {
  constructor(private logger: Logger) {}

  /**
   * Handle and log an error, returning a user-friendly message
   */
  public handle(error: unknown, context?: string): AtlassianMCPError {
    const contextStr = context ? `[${context}] ` : '';

    if (error instanceof AtlassianMCPError) {
      this.logger.error(`${contextStr}${error.message}`, error);
      return error;
    }

    if (error instanceof Error) {
      const wrappedError = new AtlassianMCPError(
        `${contextStr}${error.message}`,
        'UNKNOWN_ERROR',
        undefined,
        error
      );
      this.logger.error(`${contextStr}Unexpected error: ${error.message}`, error);
      return wrappedError;
    }

    const unknownError = new AtlassianMCPError(
      `${contextStr}An unknown error occurred: ${String(error)}`,
      'UNKNOWN_ERROR'
    );
    this.logger.error(`${contextStr}Unknown error type`, { error });
    return unknownError;
  }

  /**
   * Create a user-friendly error message
   */
  public getUserFriendlyMessage(error: AtlassianMCPError): string {
    switch (error.code) {
      case 'AUTHENTICATION_ERROR':
        return 'Authentication failed. Please check your credentials and try again.';
      
      case 'AUTHORIZATION_ERROR':
        return 'You do not have permission to perform this action. Please check your access rights.';
      
      case 'RATE_LIMIT_ERROR':
        const retryMsg = error instanceof RateLimitError && error.retryAfter 
          ? ` Please try again in ${error.retryAfter} seconds.`
          : ' Please try again later.';
        return `Rate limit exceeded.${retryMsg}`;
      
      case 'CONNECTION_ERROR':
        return 'Connection failed. Please check your internet connection and try again.';
      
      case 'CONFIGURATION_ERROR':
        return 'Configuration error. Please check your settings and try again.';
      
      case 'JIRA_ERROR':
        return `Jira operation failed: ${error.message}`;
      
      case 'CONFLUENCE_ERROR':
        return `Confluence operation failed: ${error.message}`;
      
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  /**
   * Determine if an error is retryable
   */
  public isRetryable(error: AtlassianMCPError): boolean {
    return [
      'RATE_LIMIT_ERROR',
      'CONNECTION_ERROR'
    ].includes(error.code) || 
    (error.statusCode !== undefined && error.statusCode >= 500);
  }

  /**
   * Get retry delay for retryable errors
   */
  public getRetryDelay(error: AtlassianMCPError, attempt: number): number {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
  }
}

/**
 * Async retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  errorHandler: ErrorHandler,
  maxRetries: number = 3,
  context?: string
): Promise<T> {
  let lastError: AtlassianMCPError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = errorHandler.handle(error, context);

      if (attempt === maxRetries || !errorHandler.isRetryable(lastError)) {
        throw lastError;
      }

      const delay = errorHandler.getRetryDelay(lastError, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
