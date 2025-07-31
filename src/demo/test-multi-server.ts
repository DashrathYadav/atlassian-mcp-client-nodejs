#!/usr/bin/env tsx

import { MultiServerMCPManager, ServerConfig } from '../client/multi-server-mcp-manager.js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

async function testMultiServer() {
    console.log(chalk.blue.bold('🧪 Testing Multi-Server MCP Setup'));
    console.log(chalk.gray('=====================================\n'));

    const manager = new MultiServerMCPManager();

    // Register Atlassian server
    const atlassianConfig: ServerConfig = {
        name: 'atlassian',
        command: 'npx',
        args: ['-y', 'mcp-remote@0.1.13', 'https://mcp.atlassian.com/v1/sse'],
        enabled: true
    };

    // Register database server
    const databaseConfig: ServerConfig = {
        name: 'database-server-mssql',
        command: 'dotnet',
        args: ['run', '--project', 'MsDbServer'],
        cwd: process.env['DB_SERVER_PATH'] || '../../../MCP-projects/MCP-DbServer',
        env: {
            'McpServer__Transport__Stdio__Enabled': 'true',
            'McpServer__Transport__Http__Enabled': 'false',
            'McpServer__Database__Provider': 'mssql',
            'McpServer__Database__ConnectionString': process.env['DB_CONNECTION_STRING'] || 'Server=localhost,1433;Database=app_db;User Id=sa;Password=Temp@123;TrustServerCertificate=true;',
            'McpServer__Logging__LogLevel': 'Information'
        },
        enabled: true
    };

    console.log(chalk.yellow('📋 Configuration:'));
    console.log(chalk.gray(`  Database Server Path: ${process.env['DB_SERVER_PATH'] || '../../../MCP-projects/MCP-DbServer'}`));
    console.log(chalk.gray(`  Database Connection: ${process.env['DB_CONNECTION_STRING'] ? 'Configured' : 'Using default'}`));
    console.log();

    manager.registerServer(atlassianConfig);
    manager.registerServer(databaseConfig);

    try {
        console.log(chalk.yellow('🔌 Connecting to servers...'));
        await manager.connectToAllServers();

        const connectedServers = manager.getConnectedServers();
        console.log(chalk.green(`✅ Connected to ${connectedServers.length} servers: ${connectedServers.join(', ')}`));

        const tools = manager.getAllTools();
        console.log(chalk.green(`✅ Loaded ${tools.length} total tools`));

        // Group tools by server
        const toolsByServer = tools.reduce((acc, tool) => {
            if (!acc[tool.serverName]) acc[tool.serverName] = [];
            acc[tool.serverName].push(tool);
            return acc;
        }, {} as Record<string, any[]>);

        console.log(chalk.cyan('\n📡 Available Tools by Server:'));
        for (const [server, serverTools] of Object.entries(toolsByServer)) {
            console.log(chalk.white(`\n  ${server.toUpperCase()} (${serverTools.length} tools):`));
            serverTools.forEach(tool => {
                console.log(chalk.gray(`    • ${tool.name}: ${tool.description}`));
            });
        }

        // Test a simple tool call if available
        if (tools.length > 0) {
            console.log(chalk.yellow('\n🧪 Testing tool call...'));
            const firstTool = tools[0];
            console.log(chalk.gray(`  Testing tool: ${firstTool.name} from ${firstTool.serverName}`));

            try {
                const result = await manager.callTool(firstTool.name, {});
                console.log(chalk.green(`  ✅ Tool call successful`));
                console.log(chalk.gray(`  Result type: ${typeof result}`));
            } catch (error) {
                console.log(chalk.red(`  ❌ Tool call failed: ${error}`));
            }
        }

    } catch (error) {
        console.error(chalk.red('❌ Error during testing:'), error);
    } finally {
        console.log(chalk.yellow('\n🧹 Cleaning up...'));
        await manager.disconnectFromAllServers();
        console.log(chalk.green('✅ Cleanup complete'));
    }
}

// Run the test
testMultiServer().catch(console.error); 