/**
 * SSE Transport wrapper for Atlassian MCP Server
 */

import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { AtlassianConfig } from '../../config/atlassian-config.js';
import type { Logger } from '../../utils/logger.js';
import type { AtlassianOAuthProvider } from '../auth/oauth-provider.js';
import { ConnectionError, AuthenticationError } from '../../utils/error-handler.js';

/**
 * Atlassian-specific SSE transport that handles authentication
 */
export class AtlassianSSETransport implements Transport {
  private transport: SSEClientTransport | null = null;
  private isConnected = false;

  // Transport event handlers
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private config: AtlassianConfig,
    private authProvider: AtlassianOAuthProvider,
    private logger: Logger
  ) {}

  /**
   * Start the transport connection
   */
  async start(): Promise<void> {
    if (this.isConnected) {
      this.logger.warn('Transport already connected');
      return;
    }

    this.logger.info('Starting Atlassian SSE transport');

    try {
      // Ensure we're authenticated
      if (!this.authProvider.isAuthenticated()) {
        this.logger.info('Not authenticated, starting auth flow');
        await this.authProvider.authenticate();
      }

      const tokens = this.authProvider.getTokens();
      if (!tokens) {
        throw new AuthenticationError('No valid tokens available');
      }

      // Create the SSE transport with authentication
      this.transport = new SSEClientTransport(new URL(this.config.mcpServerUrl), {
        requestInit: {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }
        }
      });

      // Set up event handlers
      this.transport.onclose = () => {
        this.logger.info('SSE transport closed');
        this.isConnected = false;
        this.onclose?.();
      };

      this.transport.onerror = (error: Error) => {
        this.logger.error('SSE transport error', error);
        this.onerror?.(error);
      };

      this.transport.onmessage = (message: JSONRPCMessage) => {
        this.logger.debug('Received SSE message', { 
          type: 'method' in message ? 'request' : 'response'
        });
        this.onmessage?.(message);
      };

      // Start the underlying transport
      await this.transport.start();
      this.isConnected = true;
      
      this.logger.info('Atlassian SSE transport connected successfully');
    } catch (error) {
      this.logger.error('Failed to start SSE transport', error);
      this.transport = null;
      this.isConnected = false;
      
      if (error instanceof Error) {
        throw new ConnectionError(`Failed to connect to Atlassian MCP server: ${error.message}`, error);
      }
      throw new ConnectionError('Failed to connect to Atlassian MCP server');
    }
  }

  /**
   * Close the transport connection
   */
  async close(): Promise<void> {
    this.logger.info('Closing Atlassian SSE transport');
    
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    
    this.isConnected = false;
  }

  /**
   * Send a message through the transport
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.transport || !this.isConnected) {
      throw new ConnectionError('Transport not connected');
    }

    this.logger.debug('Sending SSE message', { 
      type: 'method' in message ? 'request' : 'response',
      id: 'id' in message ? message.id : undefined
    });

    try {
      await this.transport.send(message);
    } catch (error) {
      this.logger.error('Failed to send SSE message', error);
      
      // Check if it's an auth error and try to refresh tokens
      if (this.isAuthError(error)) {
        this.logger.info('Authentication error detected, attempting token refresh');
        
        try {
          await this.authProvider.refreshTokens();
          
          // Reconnect with new tokens
          await this.close();
          await this.start();
          
          // Retry the message
          await this.transport!.send(message);
          return;
        } catch (refreshError) {
          this.logger.error('Token refresh failed', refreshError);
          throw new AuthenticationError('Authentication failed and token refresh unsuccessful');
        }
      }
      
      if (error instanceof Error) {
        throw new ConnectionError(`Failed to send message: ${error.message}`, error);
      }
      throw new ConnectionError('Failed to send message');
    }
  }

  /**
   * Set the protocol version for the transport
   */
  setProtocolVersion(version: string): void {
    if (this.transport) {
      this.transport.setProtocolVersion(version);
    }
  }

  /**
   * Check if the transport is connected
   */
  public isTransportConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get transport statistics/info
   */
  public getTransportInfo(): {
    connected: boolean;
    serverUrl: string;
    authenticated: boolean;
  } {
    return {
      connected: this.isConnected,
      serverUrl: this.config.mcpServerUrl,
      authenticated: this.authProvider.isAuthenticated()
    };
  }

  /**
   * Determine if an error is authentication-related
   */
  private isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('401') || 
             message.includes('unauthorized') || 
             message.includes('authentication') ||
             message.includes('token');
    }
    return false;
  }

  /**
   * Reconnect the transport (useful for recovery)
   */
  public async reconnect(): Promise<void> {
    this.logger.info('Reconnecting Atlassian SSE transport');
    
    await this.close();
    await this.start();
  }

  /**
   * Health check for the transport
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.transport) {
      return false;
    }

    try {
      // Send a ping message to check connectivity
      await this.send({
        jsonrpc: '2.0',
        method: 'ping',
        id: `health-check-${Date.now()}`
      });
      return true;
    } catch (error) {
      this.logger.warn('Health check failed', error);
      return false;
    }
  }
}
