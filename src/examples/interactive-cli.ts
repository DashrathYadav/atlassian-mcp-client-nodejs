#!/usr/bin/env node

import inquirer from 'inquirer';
import { AtlassianMCPClient } from '../client/atlassian-client.js';
import { loadConfig } from '../config/atlassian-config.js';
import { createConsoleLogger } from '../utils/logger.js';

/**
 * Interactive CLI for the Atlassian MCP Client
 * Provides a menu-driven interface for testing different operations
 */
async function runInteractiveCLI() {
  const logger = createConsoleLogger();
  
  console.log('🚀 Atlassian MCP Client - Interactive Demo');
  console.log('==========================================\n');
  
  try {
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
    logger.info('✅ Connected successfully!\n');
    
    let running = true;
    
    while (running) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🔍 Search Jira Issues', value: 'search-jira' },
            { name: '➕ Create Jira Issue', value: 'create-jira' },
            { name: '📄 Search Confluence Content', value: 'search-confluence' },
            { name: '📝 Create Confluence Page', value: 'create-confluence' },
            { name: '🛠️  List Available Tools', value: 'list-tools' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);
      
      switch (action) {
        case 'search-jira':
          await handleJiraSearch(client, logger);
          break;
          
        case 'create-jira':
          await handleJiraCreate(client, logger);
          break;
          
        case 'search-confluence':
          await handleConfluenceSearch(client, logger);
          break;
          
        case 'create-confluence':
          await handleConfluenceCreate(client, logger);
          break;
          
        case 'list-tools':
          await handleListTools(client, logger);
          break;
          
        case 'exit':
          running = false;
          break;
      }
      
      if (running) {
        console.log('\n' + '='.repeat(50) + '\n');
      }
    }
    
    // Disconnect
    await client.disconnect();
    console.log('\n👋 Goodbye!');
    
  } catch (error) {
    logger.error('CLI failed:', error);
    process.exit(1);
  }
}

async function handleJiraSearch(client: AtlassianMCPClient, logger: any) {
  const { jql } = await inquirer.prompt([
    {
      type: 'input',
      name: 'jql',
      message: 'Enter JQL query:',
      default: 'ORDER BY created DESC'
    }
  ]);
  
  try {
    const results = await client.searchJiraIssues({
      jql,
      maxResults: 5,
      fields: ['key', 'summary', 'status', 'assignee']
    });
    
    console.log('\n📊 Search Results:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    logger.error('Search failed:', error);
  }
}

async function handleJiraCreate(client: AtlassianMCPClient, logger: any) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectKey',
      message: 'Project Key:',
      default: 'TEST'
    },
    {
      type: 'input',
      name: 'summary',
      message: 'Issue Summary:',
      default: 'Demo issue from MCP client'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description (optional):'
    },
    {
      type: 'list',
      name: 'issueType',
      message: 'Issue Type:',
      choices: ['Task', 'Bug', 'Story', 'Epic']
    }
  ]);
  
  try {
    const result = await client.createJiraIssue({
      projectKey: answers.projectKey,
      summary: answers.summary,
      description: answers.description || '',
      issueType: answers.issueType,
      labels: ['mcp-demo']
    });
    
    console.log('\n✅ Issue Created:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error('Issue creation failed:', error);
  }
}

async function handleConfluenceSearch(client: AtlassianMCPClient, logger: any) {
  const { cql } = await inquirer.prompt([
    {
      type: 'input',
      name: 'cql',
      message: 'Enter CQL query:',
      default: 'type=page ORDER BY lastModified DESC'
    }
  ]);
  
  try {
    const results = await client.searchConfluenceContent({
      cql,
      limit: 5,
      expand: ['content.version', 'space']
    });
    
    console.log('\n📊 Search Results:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    logger.error('Search failed:', error);
  }
}

async function handleConfluenceCreate(client: AtlassianMCPClient, logger: any) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'spaceKey',
      message: 'Space Key:',
      default: 'TEST'
    },
    {
      type: 'input',
      name: 'title',
      message: 'Page Title:',
      default: `Demo Page ${new Date().toLocaleDateString()}`
    },
    {
      type: 'editor',
      name: 'content',
      message: 'Page Content (will open editor):',
      default: '<h1>Demo Page</h1><p>This is a demo page created via MCP.</p>'
    }
  ]);
  
  try {
    const result = await client.createConfluencePage({
      spaceKey: answers.spaceKey,
      title: answers.title,
      content: answers.content
    });
    
    console.log('\n✅ Page Created:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error('Page creation failed:', error);
  }
}

async function handleListTools(client: AtlassianMCPClient, logger: any) {
  try {
    const tools = await client.getAvailableTools();
    
    console.log('\n🛠️  Available Tools:');
    tools.forEach((tool: any) => {
      console.log(`\n- ${tool.name}`);
      console.log(`  Description: ${tool.description}`);
      if (tool.inputSchema) {
        console.log(`  Parameters: ${JSON.stringify(tool.inputSchema.properties, null, 2)}`);
      }
    });
  } catch (error) {
    logger.error('Failed to list tools:', error);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runInteractiveCLI().catch(console.error);
}

export { runInteractiveCLI };
