/**
 * Main Atlassian MCP Client
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Define result schemas
const CallToolResultSchema = z.object({
  content: z.array(z.any()),
  isError: z.boolean().optional()
});

const ListToolsResultSchema = z.object({
  tools: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    inputSchema: z.any().optional()
  }))
});

import type { FullConfig } from '../config/atlassian-config.js';
import { AtlassianOAuthProvider } from './auth/oauth-provider.js';
import { AtlassianSSETransport } from './transport/sse-transport.js';
import type { Logger } from '../utils/logger.js';
import { ErrorHandler, withRetry } from '../utils/error-handler.js';

export interface AtlassianClientOptions {
  config: FullConfig;
  logger: Logger;
}

export interface JiraSearchOptions {
  jql: string;
  maxResults?: number;
  startAt?: number;
  fields?: string[];
}

export interface ConfluenceSearchOptions {
  cql: string;
  limit?: number;
  start?: number;
  expand?: string[];
}

/**
 * Main client for interacting with Atlassian via MCP
 */
export class AtlassianMCPClient {
  private client: Client;
  private authProvider: AtlassianOAuthProvider;
  private transport: AtlassianSSETransport;
  private errorHandler: ErrorHandler;
  private isConnected = false;
  private availableTools: Tool[] = [];

  constructor(private options: AtlassianClientOptions) {
    const { config, logger } = options;

    this.errorHandler = new ErrorHandler(logger);
    this.authProvider = new AtlassianOAuthProvider(config.atlassian, logger);
    this.transport = new AtlassianSSETransport(config.atlassian, this.authProvider, logger);
    
    this.client = new Client(
      {
        name: 'atlassian-mcp-client',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
  }

  /**
   * Connect to the Atlassian MCP server
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      this.options.logger.warn('Client already connected');
      return;
    }

    this.options.logger.info('Connecting to Atlassian MCP server');

    try {
      await withRetry(
        async () => {
          await this.client.connect(this.transport);
          this.isConnected = true;
          
          // Discover available tools
          await this.discoverTools();
          
          this.options.logger.info('Successfully connected to Atlassian MCP server', {
            toolCount: this.availableTools.length
          });
        },
        this.errorHandler,
        this.options.config.rateLimit.maxRetries,
        'connect'
      );
    } catch (error) {
      this.options.logger.error('Failed to connect to Atlassian MCP server', error);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    this.options.logger.info('Disconnecting from Atlassian MCP server');
    
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
    }
    
    await this.transport.close();
    this.options.logger.info('Disconnected from Atlassian MCP server');
  }

  /**
   * Check if client is connected
   */
  public isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get authentication status
   */
  public getAuthStatus(): {
    isAuthenticated: boolean;
    transportConnected: boolean;
    toolsAvailable: number;
  } {
    return {
      isAuthenticated: this.authProvider.isAuthenticated(),
      transportConnected: this.transport.isTransportConnected(),
      toolsAvailable: this.availableTools.length
    };
  }

  /**
   * Authenticate with Atlassian (if not already authenticated)
   */
  async authenticate(): Promise<void> {
    this.options.logger.info('Starting authentication process');
    await this.authProvider.authenticate();
    this.options.logger.info('Authentication completed');
  }

  /**
   * Search Jira issues
   */
  async searchJiraIssues(options: JiraSearchOptions): Promise<any> {
    this.ensureConnected();
    
    const tool = this.findTool('jira_search') || this.findTool('search_jira_issues');
    if (!tool) {
      throw new Error('Jira search tool not available');
    }

    this.options.logger.info('Searching Jira issues', { jql: options.jql });

    return await withRetry(
      async () => {
        const result = await this.client.request({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: {
              jql: options.jql,
              maxResults: options.maxResults || 50,
              startAt: options.startAt || 0,
              fields: options.fields || ['key', 'summary', 'status', 'assignee']
            }
          }
        }, CallToolResultSchema);

        this.options.logger.info('Jira search completed successfully');
        return result;
      },
      this.errorHandler,
      this.options.config.rateLimit.maxRetries,
      'searchJiraIssues'
    );
  }

  /**
   * Create a Jira issue
   */
  async createJiraIssue(issueData: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType?: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
    [key: string]: any;
  }): Promise<any> {
    this.ensureConnected();
    
    const tool = this.findTool('jira_create') || this.findTool('create_jira_issue');
    if (!tool) {
      throw new Error('Jira create tool not available');
    }

    this.options.logger.info('Creating Jira issue', { 
      project: issueData.projectKey, 
      summary: issueData.summary 
    });

    return await withRetry(
      async () => {
        const result = await this.client.request({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: {
              project: issueData.projectKey,
              summary: issueData.summary,
              description: issueData.description || '',
              issuetype: issueData.issueType || 'Task',
              priority: issueData.priority,
              assignee: issueData.assignee,
              labels: issueData.labels || []
            }
          }
        }, CallToolResultSchema);

        this.options.logger.info('Jira issue created successfully');
        return result;
      },
      this.errorHandler,
      this.options.config.rateLimit.maxRetries,
      'createJiraIssue'
    );
  }

  /**
   * Search Confluence content
   */
  async searchConfluenceContent(options: ConfluenceSearchOptions): Promise<any> {
    this.ensureConnected();
    
    const tool = this.findTool('confluence_search') || this.findTool('search_confluence');
    if (!tool) {
      throw new Error('Confluence search tool not available');
    }

    this.options.logger.info('Searching Confluence content', { cql: options.cql });

    return await withRetry(
      async () => {
        const result = await this.client.request({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: {
              cql: options.cql,
              limit: options.limit || 25,
              start: options.start || 0,
              expand: options.expand || ['content.version', 'space']
            }
          }
        }, CallToolResultSchema);

        this.options.logger.info('Confluence search completed successfully');
        return result;
      },
      this.errorHandler,
      this.options.config.rateLimit.maxRetries,
      'searchConfluenceContent'
    );
  }

  /**
   * Create a Confluence page
   */
  async createConfluencePage(pageData: {
    spaceKey: string;
    title: string;
    content: string;
    parentId?: string;
    type?: 'page' | 'blogpost';
    [key: string]: any;
  }): Promise<any> {
    this.ensureConnected();
    
    const tool = this.findTool('confluence_create') || this.findTool('create_confluence_page');
    if (!tool) {
      throw new Error('Confluence create tool not available');
    }

    this.options.logger.info('Creating Confluence page', { 
      space: pageData.spaceKey, 
      title: pageData.title 
    });

    return await withRetry(
      async () => {
        const result = await this.client.request({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: {
              space: pageData.spaceKey,
              title: pageData.title,
              content: pageData.content,
              parentId: pageData.parentId,
              type: pageData.type || 'page'
            }
          }
        }, CallToolResultSchema);

        this.options.logger.info('Confluence page created successfully');
        return result;
      },
      this.errorHandler,
      this.options.config.rateLimit.maxRetries,
      'createConfluencePage'
    );
  }

  /**
   * Execute a natural language query
   */
  async executeQuery(query: string): Promise<any> {
    this.ensureConnected();

    this.options.logger.info('Executing natural language query', { query });

    // Try to determine the best tool based on the query
    const tool = this.selectBestTool(query);
    if (!tool) {
      throw new Error('No suitable tool found for this query');
    }

    return await withRetry(
      async () => {
        const result = await this.client.request({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: { query }
          }
        }, CallToolResultSchema);

        this.options.logger.info('Query executed successfully', { tool: tool.name });
        return result;
      },
      this.errorHandler,
      this.options.config.rateLimit.maxRetries,
      'executeQuery'
    );
  }

  /**
   * Get list of available tools
   */
  async getAvailableTools(): Promise<Tool[]> {
    this.ensureConnected();
    return [...this.availableTools];
  }

  /**
   * Discover tools available on the server
   */
  private async discoverTools(): Promise<void> {
    try {
      const toolsResult = await this.client.request({
        method: 'tools/list', 
        params: {}
      }, ListToolsResultSchema);

      this.availableTools = (toolsResult.tools || []) as Tool[];
      
      this.options.logger.info('Discovered tools', {
        tools: this.availableTools.map(t => t.name)
      });
    } catch (error) {
      this.options.logger.error('Failed to discover tools', error);
      throw error;
    }
  }

  /**
   * Find a tool by name (with fallbacks)
   */
  private findTool(name: string): Tool | undefined {
    return this.availableTools.find(tool => 
      tool.name === name || 
      tool.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Select the best tool for a natural language query
   */
  private selectBestTool(query: string): Tool | undefined {
    const lowerQuery = query.toLowerCase();
    
    // Jira keywords
    if (lowerQuery.includes('jira') || 
        lowerQuery.includes('issue') || 
        lowerQuery.includes('ticket') || 
        lowerQuery.includes('bug') ||
        lowerQuery.includes('story') ||
        lowerQuery.includes('task')) {
      return this.findTool('jira_search') || this.findTool('jira');
    }
    
    // Confluence keywords
    if (lowerQuery.includes('confluence') || 
        lowerQuery.includes('page') || 
        lowerQuery.includes('space') || 
        lowerQuery.includes('document') ||
        lowerQuery.includes('wiki')) {
      return this.findTool('confluence_search') || this.findTool('confluence');
    }
    
    // Default to first available tool
    return this.availableTools[0];
  }

  /**
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Client not connected. Call connect() first.');
    }
  }

  /**
   * Health check for the entire client
   */
  async healthCheck(): Promise<{
    overall: boolean;
    authentication: boolean;
    transport: boolean;
    toolsAvailable: boolean;
    details: any;
  }> {
    const authStatus = this.getAuthStatus();
    const transportHealth = await this.transport.healthCheck();
    
    const health = {
      overall: authStatus.isAuthenticated && transportHealth && authStatus.toolsAvailable > 0,
      authentication: authStatus.isAuthenticated,
      transport: transportHealth,
      toolsAvailable: authStatus.toolsAvailable > 0,
      details: {
        ...authStatus,
        transportHealth,
        availableTools: this.availableTools.map(t => t.name)
      }
    };

    this.options.logger.info('Health check completed', health);
    return health;
  }
}
