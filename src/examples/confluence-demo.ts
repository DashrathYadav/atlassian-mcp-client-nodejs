#!/usr/bin/env node

import { AtlassianMCPClient } from '../client/atlassian-client.js';
import { loadConfig } from '../config/atlassian-config.js';
import { createConsoleLogger } from '../utils/logger.js';

/**
 * Confluence Demo - Shows various Confluence operations using the Atlassian MCP Client
 */
async function runConfluenceDemo() {
  const logger = createConsoleLogger();
  
  try {
    logger.info('Starting Confluence demo...');
    
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
    
    // Demo 1: Search Confluence content
    logger.info('\n--- Demo 1: Search Confluence Content ---');
    try {
      const searchResults = await client.searchConfluenceContent({
        cql: 'type=page AND space=TEST ORDER BY lastModified DESC',
        limit: 5,
        expand: ['content.version', 'space', 'history.lastUpdated']
      });
      
      logger.info('Search Results:', JSON.stringify(searchResults, null, 2));
    } catch (error) {
      logger.error('Search failed:', error);
    }
    
    // Demo 2: Create a new Confluence page
    logger.info('\n--- Demo 2: Create Confluence Page ---');
    try {
      const newPage = await client.createConfluencePage({
        spaceKey: 'TEST',
        title: `Demo Page - ${new Date().toISOString()}`,
        content: `
          <h1>Demo Page</h1>
          <p>This is a demo page created by the Atlassian MCP Client at ${new Date().toLocaleString()}.</p>
          <h2>Features</h2>
          <ul>
            <li>Created via MCP (Model Context Protocol)</li>
            <li>Automated content generation</li>
            <li>Rich text formatting</li>
          </ul>
        `
      });
      
      logger.info('Created Page:', JSON.stringify(newPage, null, 2));
    } catch (error) {
      logger.error('Page creation failed:', error);
    }
    
    // Demo 3: Search with different parameters
    logger.info('\n--- Demo 3: Advanced Search ---');
    try {
      const advancedSearch = await client.searchConfluenceContent({
        cql: 'text ~ "demo" AND type=page',
        limit: 10,
        start: 0,
        expand: ['content.version', 'space', 'ancestors']
      });
      
      logger.info('Advanced Search Results:', JSON.stringify(advancedSearch, null, 2));
    } catch (error) {
      logger.error('Advanced search failed:', error);
    }
    
    // Disconnect
    await client.disconnect();
    logger.info('\nConfluence demo completed successfully!');
    
  } catch (error) {
    logger.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runConfluenceDemo().catch(console.error);
}

export { runConfluenceDemo };
