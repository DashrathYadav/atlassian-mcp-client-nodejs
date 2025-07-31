/**
 * Simplified Atlassian MCP Client
 * 
 * A clean client for connecting to the Atlassian Remote MCP Server
 * using the mcp-remote proxy. No custom wrappers - just direct MCP access.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import EventEmitter from "events";

export interface AtlassianMCPClientOptions {
  serverUrl?: string;
  mcpRemoteVersion?: string;
  debug?: boolean;
}

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

      // Initialize cloudId
      await this.initializeCloudId();

    } catch (error) {
      console.error("Failed to connect to Atlassian MCP server:", error);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Initialize cloudId from accessible resources
   */
  private async initializeCloudId(): Promise<void> {
    try {
      const resources = await this.callTool("getAccessibleAtlassianResources", {});

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
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
      }

      if (this.transport) {
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
   * Call any MCP tool directly with automatic cloudId inclusion
   */
  async callTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    // Add cloudId to parameters if available and not already present
    const finalParameters = { ...parameters };
    if (this.cloudId && !finalParameters.cloudId) {
      finalParameters.cloudId = this.cloudId;
    }

    try {
      const response = await this.client.callTool({
        name: toolName,
        arguments: finalParameters
      });

      // Parse response content
      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        if (content.type === "text" && content.text) {
          try {
            return JSON.parse(content.text);
          } catch (e) {
            // If not JSON, return as string
            return content.text;
          }
        }
      }

      return response;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Get the cloudId (for debugging)
   */
  getCloudId(): string | null {
    return this.cloudId;
  }

  /**
   * Get the underlying MCP client (for advanced usage)
   */
  getMCPClient(): Client {
    return this.client;
  }
}

export default AtlassianMCPClient;
