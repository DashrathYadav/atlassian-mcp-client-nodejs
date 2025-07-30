/**
 * OAuth 2.1 Authentication Provider for Atlassian
 */

import crypto from 'crypto';
import express from 'express';
import { Server } from 'http';
import open from 'open';
import type { AtlassianConfig } from '../../config/atlassian-config.js';
import type { Logger } from '../../utils/logger.js';
import { AuthenticationError } from '../../utils/error-handler.js';

export interface OAuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  tokens?: OAuthTokens;
  expiresAt?: Date;
}

/**
 * OAuth 2.1 Provider implementing PKCE flow for Atlassian
 */
export class AtlassianOAuthProvider {
  private tokens: OAuthTokens | null = null;
  private codeVerifier: string | null = null;
  private state: string | null = null;
  private server: Server | null = null;
  private authPromise: Promise<OAuthTokens> | null = null;

  constructor(
    private config: AtlassianConfig,
    private logger: Logger
  ) {}

  /**
   * Check if currently authenticated
   */
  public isAuthenticated(): boolean {
    if (!this.tokens) return false;
    
    // Check if tokens are expired (with 5 minute buffer)
    if (this.tokens.expires_in) {
      const expiresAt = new Date(Date.now() + (this.tokens.expires_in * 1000));
      const buffer = 5 * 60 * 1000; // 5 minutes
      return Date.now() < (expiresAt.getTime() - buffer);
    }
    
    return true;
  }

  /**
   * Get current tokens
   */
  public getTokens(): OAuthTokens | null {
    return this.tokens;
  }

  /**
   * Start the OAuth 2.1 authentication flow
   */
  public async authenticate(): Promise<OAuthTokens> {
    if (this.isAuthenticated() && this.tokens) {
      this.logger.info('Already authenticated, returning existing tokens');
      return this.tokens;
    }

    if (this.authPromise) {
      this.logger.info('Authentication in progress, waiting for completion');
      return this.authPromise;
    }

    this.logger.info('Starting OAuth 2.1 authentication flow');
    
    this.authPromise = this.performAuthFlow();
    
    try {
      const tokens = await this.authPromise;
      this.authPromise = null;
      return tokens;
    } catch (error) {
      this.authPromise = null;
      throw error;
    }
  }

  /**
   * Refresh tokens if possible
   */
  public async refreshTokens(): Promise<OAuthTokens> {
    if (!this.tokens?.refresh_token) {
      throw new AuthenticationError('No refresh token available');
    }

    this.logger.info('Refreshing OAuth tokens');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refresh_token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    try {
      const response = await fetch(`https://auth.atlassian.com/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AuthenticationError(`Token refresh failed: ${errorText}`);
      }

      const newTokens = await response.json() as OAuthTokens;
      this.tokens = newTokens;
      
      this.logger.info('OAuth tokens refreshed successfully');
      return newTokens;
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);
      throw new AuthenticationError('Token refresh failed', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Revoke current tokens
   */
  public async revoke(): Promise<void> {
    if (!this.tokens) {
      this.logger.warn('No tokens to revoke');
      return;
    }

    this.logger.info('Revoking OAuth tokens');

    try {
      await fetch(`https://auth.atlassian.com/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: this.tokens.access_token,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        })
      });

      this.tokens = null;
      this.logger.info('OAuth tokens revoked successfully');
    } catch (error) {
      this.logger.error('Failed to revoke tokens', error);
      // Continue anyway and clear local tokens
      this.tokens = null;
    }
  }

  /**
   * Perform the complete OAuth flow
   */
  private async performAuthFlow(): Promise<OAuthTokens> {
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    this.state = crypto.randomBytes(32).toString('hex');

    // Start local server for callback
    const { server, callbackPromise } = await this.startCallbackServer();
    this.server = server;

    try {
      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl(codeChallenge);
      
      this.logger.info('Opening browser for authentication', { authUrl });
      await open(authUrl);

      // Wait for callback
      const authCode = await callbackPromise;

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(authCode);
      
      this.tokens = tokens;
      this.logger.info('Authentication completed successfully');
      
      return tokens;
    } finally {
      // Clean up
      if (this.server) {
        this.server.close();
        this.server = null;
      }
    }
  }

  /**
   * Start HTTP server to handle OAuth callback
   */
  private async startCallbackServer(): Promise<{
    server: Server;
    callbackPromise: Promise<string>;
  }> {
    const app = express();
    
    let resolveCallback: (code: string) => void;
    let rejectCallback: (error: Error) => void;
    
    const callbackPromise = new Promise<string>((resolve, reject) => {
      resolveCallback = resolve;
      rejectCallback = reject;
    });

    app.get('/callback', (req, res) => {
      const { code, state, error } = req.query;

      if (error) {
        const errorMsg = `OAuth error: ${error}`;
        this.logger.error(errorMsg);
        res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
        rejectCallback(new AuthenticationError(errorMsg));
        return;
      }

      if (state !== this.state) {
        const errorMsg = 'Invalid state parameter';
        this.logger.error(errorMsg);
        res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
        rejectCallback(new AuthenticationError(errorMsg));
        return;
      }

      if (typeof code !== 'string') {
        const errorMsg = 'Missing authorization code';
        this.logger.error(errorMsg);
        res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
        rejectCallback(new AuthenticationError(errorMsg));
        return;
      }

      res.send(`
        <h1>Authentication Successful!</h1>
        <p>You can close this window and return to the application.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      `);

      resolveCallback(code);
    });

    const server = app.listen(new URL(this.config.redirectUri).port, () => {
      this.logger.info(`OAuth callback server started on ${this.config.redirectUri}`);
    });

    return { server, callbackPromise };
  }

  /**
   * Build authorization URL with PKCE parameters
   */
  private buildAuthorizationUrl(codeChallenge: string): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state: this.state!,
      response_type: 'code',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(authCode: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: authCode,
      redirect_uri: this.config.redirectUri,
      code_verifier: this.codeVerifier!
    });

    try {
      const response = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AuthenticationError(`Token exchange failed: ${errorText}`);
      }

      const tokens = await response.json() as OAuthTokens;
      this.logger.info('Successfully exchanged authorization code for tokens');
      
      return tokens;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens', error);
      throw new AuthenticationError('Token exchange failed', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }
}
