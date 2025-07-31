#!/usr/bin/env node

import { Command } from 'commander';
import { AtlassianMCPClient } from './client/atlassian-mcp-client';
import { SimpleAIAtlassianCLI } from './cli/ai-cli';

const program = new Command();

program
  .name('atlassian-mcp-client')
  .description('Simple AI-powered Model Context Protocol client for Atlassian\'s Remote MCP Server')
  .version('1.0.0');

program
  .command('ai')
  .description('Start AI-powered interactive session')
  .action(async () => {
    try {
      const cli = new SimpleAIAtlassianCLI();
      await cli.start();
    } catch (error) {
      console.error('AI session failed:', error);
      process.exit(1);
    }
  });



program
  .command('connect')
  .description('Test basic MCP connection')
  .action(async () => {
    try {
      console.log('Testing Atlassian MCP connection...');
      const client = new AtlassianMCPClient();

      await client.connect();
      console.log('✅ Connected successfully!');

      const tools = await client.listTools();
      console.log(`📋 Found ${tools.length} available tools:`);
      tools.forEach((tool: any) => {
        console.log(`  • ${tool.name}: ${tool.description || 'No description'}`);
      });

      await client.disconnect();
      console.log('✅ Disconnected successfully!');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      process.exit(1);
    }
  });

program
  .command('tools')
  .description('List available MCP tools')
  .action(async () => {
    try {
      const client = new AtlassianMCPClient();
      await client.connect();

      const tools = await client.listTools();
      console.log(`\n📋 Available MCP Tools (${tools.length}):`);
      console.log('=====================================');

      tools.forEach((tool: any, index: number) => {
        console.log(`\n${index + 1}. ${tool.name}`);
        console.log(`   Description: ${tool.description || 'No description available'}`);
      });

      await client.disconnect();
    } catch (error) {
      console.error('Failed to list tools:', error);
      process.exit(1);
    }
  });

program.parse();

export { AtlassianMCPClient, SimpleAIAtlassianCLI };
