import { GenericMCPClient, MCPClientOptions, ToolInfo } from './generic-mcp-client.js';
import EventEmitter from 'events';
import path from 'path';

export interface ServerConfig {
    name: string;
    command: string;
    args: string[];
    cwd?: string; // Can be relative or absolute path
    env?: Record<string, string>;
    enabled?: boolean;
}

export class MultiServerMCPManager extends EventEmitter {
    private clients: Map<string, GenericMCPClient> = new Map();
    private serverConfigs: Map<string, ServerConfig> = new Map();
    private allTools: ToolInfo[] = [];

    constructor() {
        super();
    }

    /**
     * Register a server configuration
     */
    registerServer(config: ServerConfig): void {
        this.serverConfigs.set(config.name, config);
        console.log(`Registered server: ${config.name}`);
        if (config.cwd) {
            console.log(`  Working directory: ${config.cwd}`);
        }
    }

    /**
     * Connect to all registered servers
     */
    async connectToAllServers(): Promise<void> {
        const connectionPromises: Promise<void>[] = [];

        for (const [serverName, config] of this.serverConfigs) {
            if (config.enabled !== false) {
                connectionPromises.push(this.connectToServer(serverName));
            }
        }

        await Promise.allSettled(connectionPromises);
    }

    /**
     * Connect to a specific server
     */
    async connectToServer(serverName: string): Promise<void> {
        const config = this.serverConfigs.get(serverName);
        if (!config) {
            throw new Error(`Server ${serverName} not registered`);
        }

        if (this.clients.has(serverName)) {
            console.log(`Already connected to ${serverName}`);
            return;
        }

        const clientOptions: MCPClientOptions = {
            serverName: config.name,
            command: config.command,
            args: config.args,
            ...(config.cwd && { cwd: config.cwd }),
            ...(config.env && { env: config.env })
        };

        const client = new GenericMCPClient(clientOptions);

        try {
            await client.connect();
            this.clients.set(serverName, client);

            // Load tools from this server
            const tools = await client.listTools();
            this.allTools.push(...tools);

            console.log(`Loaded ${tools.length} tools from ${serverName}`);

        } catch (error) {
            console.error(`Failed to connect to ${serverName}:`, error);
            throw error;
        }
    }

    /**
     * Get all available tools from all servers
     */
    getAllTools(): ToolInfo[] {
        return this.allTools;
    }

    /**
     * Get tools from a specific server
     */
    getToolsFromServer(serverName: string): ToolInfo[] {
        return this.allTools.filter(tool => tool.serverName === serverName);
    }

    /**
     * Call a tool on the appropriate server
     */
    async callTool(toolName: string, parameters: Record<string, any>): Promise<any> {
        // Find which server has this tool
        const tool = this.allTools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found in any server`);
        }

        const client = this.clients.get(tool.serverName);
        if (!client) {
            throw new Error(`Server ${tool.serverName} not connected`);
        }

        // Add cloudId automatically for Atlassian tools if not provided
        let finalParameters = { ...parameters };
        if (tool.serverName === "atlassian" && !finalParameters["cloudId"]) {
            // Use environment variable for cloudId
            const cloudId = process.env['ATLASSIAN_CLOUD_ID'];
            if (cloudId) {
                finalParameters["cloudId"] = cloudId;
            } else {
                console.warn("⚠️  ATLASSIAN_CLOUD_ID environment variable not set. Atlassian tools may fail.");
            }
        }

        return await client.callTool(toolName, finalParameters);
    }

    /**
     * Disconnect from all servers
     */
    async disconnectFromAllServers(): Promise<void> {
        const disconnectPromises: Promise<void>[] = [];

        for (const [serverName, client] of this.clients) {
            disconnectPromises.push(client.disconnect());
        }

        await Promise.allSettled(disconnectPromises);
        this.clients.clear();
        this.allTools = [];
    }

    /**
     * Get connected servers
     */
    getConnectedServers(): string[] {
        return Array.from(this.clients.keys());
    }

    /**
     * Check if a server is connected
     */
    isServerConnected(serverName: string): boolean {
        const client = this.clients.get(serverName);
        return client ? client.isConnectedToServer() : false;
    }
} 