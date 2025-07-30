/**
 * Configuration management for Atlassian MCP Client
 */

import 'dotenv/config';

export interface AtlassianConfig {
  siteUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  mcpServerUrl: string;
  scopes: string[];
}

export interface ApplicationConfig {
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  nodeEnv: 'development' | 'production' | 'test';
  debugMode: boolean;
}

export interface RateLimitConfig {
  maxRequestsPerHour: number;
  retryDelay: number;
  maxRetries: number;
}

export interface FullConfig {
  atlassian: AtlassianConfig;
  app: ApplicationConfig;
  rateLimit: RateLimitConfig;
}

/**
 * Load configuration from environment variables and defaults
 */
export function loadConfig(): FullConfig {
  // Validate required environment variables
  const requiredEnvVars = [
    'ATLASSIAN_SITE_URL',
    'ATLASSIAN_CLIENT_ID',
    'ATLASSIAN_CLIENT_SECRET'
  ];

  const missing = requiredEnvVars.filter(env => !process.env[env]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    atlassian: {
      siteUrl: process.env['ATLASSIAN_SITE_URL']!,
      clientId: process.env['ATLASSIAN_CLIENT_ID']!,
      clientSecret: process.env['ATLASSIAN_CLIENT_SECRET']!,
      redirectUri: process.env['ATLASSIAN_REDIRECT_URI'] || 'http://localhost:3000/callback',
      mcpServerUrl: process.env['ATLASSIAN_MCP_SERVER_URL'] || 'https://mcp.atlassian.com/v1/sse',
      scopes: [
        'read:jira-user',
        'read:jira-work',
        'write:jira-work',
        'manage:jira-project',
        'read:confluence-content.all',
        'write:confluence-content',
        'read:confluence-space.summary',
        'read:confluence-props',
        'write:confluence-props'
      ]
    },
    app: {
      port: parseInt(process.env['PORT'] || '3000', 10),
      logLevel: (process.env['LOG_LEVEL'] as any) || 'info',
      nodeEnv: (process.env['NODE_ENV'] as any) || 'development',
      debugMode: process.env['DEBUG_MODE'] === 'true'
    },
    rateLimit: {
      maxRequestsPerHour: 1000, // Adjust based on your Atlassian plan
      retryDelay: 1000, // 1 second
      maxRetries: 3
    }
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: FullConfig): void {
  // Validate Atlassian site URL
  try {
    new URL(`https://${config.atlassian.siteUrl}`);
  } catch {
    throw new Error(`Invalid Atlassian site URL: ${config.atlassian.siteUrl}`);
  }

  // Validate redirect URI
  try {
    new URL(config.atlassian.redirectUri);
  } catch {
    throw new Error(`Invalid redirect URI: ${config.atlassian.redirectUri}`);
  }

  // Validate MCP server URL
  try {
    new URL(config.atlassian.mcpServerUrl);
  } catch {
    throw new Error(`Invalid MCP server URL: ${config.atlassian.mcpServerUrl}`);
  }

  // Validate port
  if (config.app.port < 1 || config.app.port > 65535) {
    throw new Error(`Invalid port: ${config.app.port}`);
  }
}

/**
 * Get default configuration for testing
 */
export function getTestConfig(): FullConfig {
  return {
    atlassian: {
      siteUrl: 'test-site.atlassian.net',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      mcpServerUrl: 'https://mcp.atlassian.com/v1/sse',
      scopes: ['read:jira-user', 'read:confluence-content.all']
    },
    app: {
      port: 3000,
      logLevel: 'info',
      nodeEnv: 'test',
      debugMode: false
    },
    rateLimit: {
      maxRequestsPerHour: 100,
      retryDelay: 500,
      maxRetries: 2
    }
  };
}
