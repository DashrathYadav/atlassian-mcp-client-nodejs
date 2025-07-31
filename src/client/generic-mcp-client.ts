import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import EventEmitter from "events";
import path from "path";

export interface MCPClientOptions {
    serverName: string;
    command: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    debug?: boolean;
}

export interface ToolInfo {
    name: string;
    description: string;
    serverName: string;
}

export class GenericMCPClient extends EventEmitter {
    private client: Client;
    private transport: StdioClientTransport | null = null;
    private options: MCPClientOptions;
    private isConnected = false;
    private serverName: string;

    constructor(options: MCPClientOptions) {
        super();
        this.options = options;
        this.serverName = options.serverName;

        this.client = new Client(
            { name: `${this.serverName}-mcp-client`, version: "1.0.0" },
            {}
        );
    }

    async connect(): Promise<void> {
        try {
            if (this.isConnected) {
                console.log(`Already connected to ${this.serverName} MCP server`);
                return;
            }

            console.log(`Connecting to ${this.serverName} MCP server...`);

            // Resolve the working directory path
            let resolvedCwd = this.options.cwd;
            if (resolvedCwd && !path.isAbsolute(resolvedCwd)) {
                resolvedCwd = path.resolve(process.cwd(), resolvedCwd);
            }

            // Create transport with custom configuration
            this.transport = new StdioClientTransport({
                command: this.options.command,
                args: this.options.args,
                cwd: resolvedCwd,
                env: this.options.env
            });

            // Connect the MCP client
            await this.client.connect(this.transport);
            this.isConnected = true;

            console.log(`Successfully connected to ${this.serverName} MCP server!`);
            if (resolvedCwd) {
                console.log(`  Working directory: ${resolvedCwd}`);
            }
            this.emit("connected");

        } catch (error) {
            console.error(`Failed to connect to ${this.serverName} MCP server:`, error);
            await this.disconnect();
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.client && this.isConnected) {
                await this.client.close();
            }

            if (this.transport) {
                this.transport = null;
            }

            this.isConnected = false;
            console.log(`Disconnected from ${this.serverName} MCP server`);
            this.emit("disconnected");
        } catch (error) {
            console.error(`Error during disconnect from ${this.serverName}:`, error);
        }
    }

    async listTools(): Promise<ToolInfo[]> {
        if (!this.isConnected) {
            throw new Error(`Not connected to ${this.serverName} MCP server`);
        }

        const response = await this.client.listTools();
        return response.tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description || 'No description available',
            serverName: this.serverName
        }));
    }

    async callTool(toolName: string, parameters: Record<string, any>): Promise<any> {
        if (!this.isConnected) {
            throw new Error(`Not connected to ${this.serverName} MCP server`);
        }

        try {
            const response = await this.client.callTool({
                name: toolName,
                arguments: parameters
            });

            // Parse response content
            if (response.content && Array.isArray(response.content) && response.content.length > 0) {
                const content = response.content[0];
                if (content.type === "text" && content.text) {
                    try {
                        return JSON.parse(content.text);
                    } catch (e) {
                        return content.text;
                    }
                }
            }

            return response;
        } catch (error) {
            console.error(`Error calling tool ${toolName} on ${this.serverName}:`, error);
            throw error;
        }
    }

    isConnectedToServer(): boolean {
        return this.isConnected;
    }

    getServerName(): string {
        return this.serverName;
    }

    getMCPClient(): Client {
        return this.client;
    }
} 