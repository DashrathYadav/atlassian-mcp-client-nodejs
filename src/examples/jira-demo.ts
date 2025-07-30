#!/usr/bin/env node

import { AtlassianMCPClient } from '../client/atlassian-client.js';
import { loadConfig } from '../config/atlassian-config.js';
import { createConsoleLogger } from '../utils/logger.js';

/**
 * Jira Demo - Shows various Jira operations using the Atlassian MCP Client
 */
async function runJiraDemo() {
  const logger = createConsoleLogger();
  
  try {
    logger.info('Starting Jira demo...');
    
    // Load configuration
    const config = loadConfig();
    logger.info('Configuration loaded successfully');
    
    // Create client
    const client = new AtlassianMCPClient({
      config,
      logger
    });
    
    // Connect to MCP server
    logger.info('Connecting to Atlassian MCP server...');
    await client.connect();
    logger.info('Connected successfully!');
    
    // Demo 1: Search for Jira issues
    logger.info('\n--- Demo 1: Search Jira Issues ---');
    try {
      const searchResults = await client.searchJiraIssues({
        jql: 'project = TEST AND status != Done ORDER BY created DESC',
        maxResults: 5,
        fields: ['key', 'summary', 'status', 'assignee', 'created']
      });
      
      logger.info('Search Results:', JSON.stringify(searchResults, null, 2));
    } catch (error) {
      logger.error('Search failed:', error);
    }
    
    // Demo 2: Create a new Jira issue
    logger.info('\n--- Demo 2: Create Jira Issue ---');
    try {
      const newIssue = await client.createJiraIssue({
        projectKey: 'TEST',
        summary: `Demo Issue - ${new Date().toISOString()}`,
        description: 'This is a demo issue created by the Atlassian MCP Client',
        issueType: 'Task',
        priority: 'Medium',
        labels: ['demo', 'mcp-client']
      });
      
      logger.info('Created Issue:', JSON.stringify(newIssue, null, 2));
    } catch (error) {
      logger.error('Issue creation failed:', error);
    }
    
    // Demo 3: Get available tools
    logger.info('\n--- Demo 3: Available Tools ---');
    try {
      const tools = await client.getAvailableTools();
      logger.info('Available Tools:');
      tools.forEach((tool: any) => {
        logger.info(`- ${tool.name}: ${tool.description}`);
      });
    } catch (error) {
      logger.error('Failed to list tools:', error);
    }
    
    // Disconnect
    await client.disconnect();
    logger.info('\nJira demo completed successfully!');
    
  } catch (error) {
    logger.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runJiraDemo().catch(console.error);
}

export { runJiraDemo };
