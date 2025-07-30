/**
 * Atlassian MCP Client
 * 
 * A complete client for connecting to the Atlassian Remote MCP Server
 * using the mcp-remote proxy for authentication and communication.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import EventEmitter from "events";
import { z } from "zod";

export interface AtlassianMCPClientOptions {
  serverUrl?: string;
  mcpRemoteVersion?: string;
  debug?: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
  project: {
    key: string;
    name: string;
  };
  issueType: {
    name: string;
    iconUrl?: string;
  };
}

export interface ConfluencePage {
  id: string;
  title: string;
  content?: string;
  space: {
    key: string;
    name: string;
  };
  version: {
    number: number;
  };
  created: string;
  updated: string;
  webUrl: string;
}

// Schema for MCP responses
const ContentSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const ResponseSchema = z.object({
  content: z.array(ContentSchema).optional(),
});

export class AtlassianMCPClient extends EventEmitter {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private options: AtlassianMCPClientOptions;
  private isConnected = false;
  private cloudId: string | null = null;

  constructor(options: AtlassianMCPClientOptions = {}) {
    super();
    this.options = {
      serverUrl: "https://mcp.atlassian.com/v1/sse",
      mcpRemoteVersion: "0.1.13",
      debug: false,
      ...options
    };

    this.client = new Client(
      { name: "atlassian-mcp-client", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  /**
   * Connect to the Atlassian MCP server via mcp-remote proxy
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        console.log("Already connected to Atlassian MCP server");
        return;
      }

      console.log("Starting mcp-remote proxy...");
      
      // Create transport - it will handle the mcp-remote process
      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", `mcp-remote@${this.options.mcpRemoteVersion}`, this.options.serverUrl!]
      });

      // Connect the MCP client
      await this.client.connect(this.transport);
      this.isConnected = true;

      console.log("Successfully connected to Atlassian MCP server!");
      this.emit("connected");

      // List available tools
      const tools = await this.listTools();
      console.log("Available tools:", tools.map(t => t.name));

      // Get cloudId from accessible resources
      await this.initializeCloudId();

    } catch (error) {
      console.error("Failed to connect to Atlassian MCP server:", error);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
      }
      
      if (this.transport) {
        // The transport will handle cleaning up the process
        this.transport = null;
      }

      this.isConnected = false;
      console.log("Disconnected from Atlassian MCP server");
      this.emit("disconnected");
    } catch (error) {
      console.error("Error during disconnect:", error);
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools() {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.client.listTools();
    return response.tools;
  }

  /**
   * Initialize cloudId from accessible resources
   */
  private async initializeCloudId(): Promise<void> {
    try {
      const resources = await this.getAccessibleResources();
      
      if (Array.isArray(resources) && resources.length > 0) {
        // Extract cloudId from the first accessible resource
        const firstResource = resources[0];
        if (firstResource.id) {
          this.cloudId = firstResource.id;
          console.log(`Using cloudId: ${this.cloudId}`);
        } else {
          console.warn("No cloudId found in accessible resources");
        }
      } else {
        console.warn("No accessible resources found");
      }
    } catch (error) {
      console.warn("Could not initialize cloudId:", error);
    }
  }

  /**
   * Search Jira issues using JQL
   */
  async searchJiraIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    if (!this.cloudId) {
      throw new Error("CloudId not initialized. Make sure you are connected.");
    }

    try {
      const response = await this.client.callTool({
        name: "searchJiraIssuesUsingJql",
        arguments: { 
          cloudId: this.cloudId,
          jql, 
          maxResults 
        }
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          const result = JSON.parse(content.text);
          return result.issues || result || [];
        }
      }

      return [];
    } catch (error) {
      console.error("Error searching Jira issues:", error);
      throw error;
    }
  }

  /**
   * Create a new Jira issue
   */
  async createJiraIssue(
    projectKey: string,
    summary: string,
    description?: string,
    issueType: string = "Task"
  ): Promise<JiraIssue> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "createJiraIssue",
        arguments: {
          projectKey,
          summary,
          description,
          issueType
        }
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          return JSON.parse(content.text);
        }
      }

      throw new Error("Failed to create Jira issue");
    } catch (error) {
      console.error("Error creating Jira issue:", error);
      throw error;
    }
  }

  /**
   * Update a Jira issue
   */
  async updateJiraIssue(
    issueKey: string,
    updates: { summary?: string; description?: string; assignee?: string }
  ): Promise<JiraIssue> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "jira_update_issue",
        arguments: {
          issueKey,
          ...updates
        }
      });

      if (response.content && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text") {
          return JSON.parse(content.text);
        }
      }

      throw new Error("Failed to update Jira issue");
    } catch (error) {
      console.error("Error updating Jira issue:", error);
      throw error;
    }
  }

  /**
   * Search Confluence content
   */
  async searchConfluenceContent(query: string, maxResults: number = 20): Promise<ConfluencePage[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "confluence_search",
        arguments: {
          cql: query,
          maxResults: maxResults
        }
      });

      if (response.content && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text") {
          return JSON.parse(content.text);
        }
      }

      return [];
    } catch (error) {
      console.error("Error searching Confluence content:", error);
      throw error;
    }
  }

  /**
   * Create a new Confluence page
   */
  async createConfluencePage(
    spaceKey: string,
    title: string,
    content: string,
    parentPageId?: string
  ): Promise<ConfluencePage> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "confluence_create_page",
        arguments: {
          spaceKey,
          title,
          content,
          parentPageId
        }
      });

      if (response.content && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text") {
          return JSON.parse(content.text);
        }
      }

      throw new Error("Failed to create Confluence page");
    } catch (error) {
      console.error("Error creating Confluence page:", error);
      throw error;
    }
  }

  /**
   * Get Jira projects
   */
  async getJiraProjects(): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    if (!this.cloudId) {
      throw new Error("CloudId not initialized. Make sure you are connected.");
    }

    try {
      const response = await this.client.callTool({
        name: "getVisibleJiraProjects",
        arguments: { cloudId: this.cloudId }
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          return JSON.parse(content.text);
        }
      }

      return [];
    } catch (error) {
      console.error("Error getting Jira projects:", error);
      throw error;
    }
  }

  /**
   * Get Confluence spaces
   */
  async getConfluenceSpaces(): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "getConfluenceSpaces",
        arguments: {}
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          return JSON.parse(content.text);
        }
      }

      return [];
    } catch (error) {
      console.error("Error getting Confluence spaces:", error);
      throw error;
    }
  }

  /**
   * Get pages in a Confluence space
   */
  async getPagesInSpace(spaceKey: string, maxResults: number = 25): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "getPagesInConfluenceSpace",
        arguments: { spaceKey, maxResults }
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          return JSON.parse(content.text);
        }
      }

      return [];
    } catch (error) {
      console.error("Error getting pages in Confluence space:", error);
      throw error;
    }
  }

  /**
   * Get Jira issue details
   */
  async getJiraIssue(issueKey: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    if (!this.cloudId) {
      throw new Error("CloudId not initialized. Make sure you are connected.");
    }

    try {
      const response = await this.client.callTool({
        name: "getJiraIssue",
        arguments: { 
          cloudId: this.cloudId,
          issueIdOrKey: issueKey  // Fixed parameter name
        }
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          return JSON.parse(content.text);
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting Jira issue:", error);
      throw error;
    }
  }

  /**
   * Get available transitions for a Jira issue
   */
  async getJiraIssueTransitions(issueKey: string): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    if (!this.cloudId) {
      throw new Error("CloudId not initialized. Make sure you are connected.");
    }

    try {
      const response = await this.client.callTool({
        name: "getTransitionsForJiraIssue",
        arguments: { 
          cloudId: this.cloudId,
          issueIdOrKey: issueKey 
        }
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          const result = JSON.parse(content.text);
          return result.transitions || [];
        }
      }

      return [];
    } catch (error) {
      console.error("Error getting Jira issue transitions:", error);
      throw error;
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<any> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "atlassianUserInfo",
        arguments: {}
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          return JSON.parse(content.text);
        }
      }

      return {};
    } catch (error) {
      console.error("Error getting user info:", error);
      throw error;
    }
  }

  /**
   * Get accessible Atlassian resources
   */
  async getAccessibleResources(): Promise<any> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const response = await this.client.callTool({
        name: "getAccessibleAtlassianResources",
        arguments: {}
      });

      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          return JSON.parse(content.text);
        }
      }

      return {};
    } catch (error) {
      console.error("Error getting accessible resources:", error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }
}

export default AtlassianMCPClient;
