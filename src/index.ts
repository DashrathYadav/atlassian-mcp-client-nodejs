#!/usr/bin/env node

import { Command } from 'commander';
import { AtlassianMCPClient } from './client/atlassian-client.js';
import { loadConfig } from './config/atlassian-config.js';
import { createConsoleLogger } from './utils/logger.js';
import { runJiraDemo } from './examples/jira-demo.js';
import { runConfluenceDemo } from './examples/confluence-demo.js';
import { runInteractiveCLI } from './examples/interactive-cli.js';

const program = new Command();

program
  .name('atlassian-mcp-client')
  .description('Atlassian MCP Client - Connect to Atlassian services via Model Context Protocol')
  .version('1.0.0');

program
  .command('demo')
  .description('Run demonstration of client capabilities')
  .option('-t, --type <type>', 'Demo type: jira, confluence, or interactive', 'interactive')
  .action(async (options) => {
    try {
      switch (options.type.toLowerCase()) {
        case 'jira':
          await runJiraDemo();
          break;
        case 'confluence':
          await runConfluenceDemo();
          break;
        case 'interactive':
        default:
          await runInteractiveCLI();
          break;
      }
    } catch (error) {
      console.error('Demo failed:', error);
      process.exit(1);
    }
  });

program
  .command('search-jira')
  .description('Search Jira issues')
  .requiredOption('-q, --jql <jql>', 'JQL query')
  .option('-m, --max <number>', 'Maximum results', '10')
  .option('-f, --fields <fields>', 'Comma-separated field list', 'key,summary,status')
  .action(async (options) => {
    const logger = createConsoleLogger();
    
    try {
      const config = loadConfig();
      const client = new AtlassianMCPClient({ config, logger });
      
      await client.connect();
      
      const results = await client.searchJiraIssues({
        jql: options.jql,
        maxResults: parseInt(options.max),
        fields: options.fields.split(',')
      });
      
      console.log(JSON.stringify(results, null, 2));
      
      await client.disconnect();
    } catch (error) {
      logger.error('Search failed:', error);
      process.exit(1);
    }
  });

program
  .command('create-jira')
  .description('Create a Jira issue')
  .requiredOption('-p, --project <project>', 'Project key')
  .requiredOption('-s, --summary <summary>', 'Issue summary')
  .option('-d, --description <description>', 'Issue description')
  .option('-t, --type <type>', 'Issue type', 'Task')
  .option('--priority <priority>', 'Priority level')
  .option('--assignee <assignee>', 'Assignee username')
  .action(async (options) => {
    const logger = createConsoleLogger();
    
    try {
      const config = loadConfig();
      const client = new AtlassianMCPClient({ config, logger });
      
      await client.connect();
      
      const result = await client.createJiraIssue({
        projectKey: options.project,
        summary: options.summary,
        description: options.description || '',
        issueType: options.type,
        priority: options.priority,
        assignee: options.assignee,
        labels: ['mcp-cli']
      });
      
      console.log(JSON.stringify(result, null, 2));
      
      await client.disconnect();
    } catch (error) {
      logger.error('Issue creation failed:', error);
      process.exit(1);
    }
  });

program
  .command('search-confluence')
  .description('Search Confluence content')
  .requiredOption('-q, --cql <cql>', 'CQL query')
  .option('-l, --limit <number>', 'Result limit', '10')
  .option('-e, --expand <expand>', 'Comma-separated expand list', 'content.version,space')
  .action(async (options) => {
    const logger = createConsoleLogger();
    
    try {
      const config = loadConfig();
      const client = new AtlassianMCPClient({ config, logger });
      
      await client.connect();
      
      const results = await client.searchConfluenceContent({
        cql: options.cql,
        limit: parseInt(options.limit),
        expand: options.expand.split(',')
      });
      
      console.log(JSON.stringify(results, null, 2));
      
      await client.disconnect();
    } catch (error) {
      logger.error('Search failed:', error);
      process.exit(1);
    }
  });

program
  .command('create-confluence')
  .description('Create a Confluence page')
  .requiredOption('-s, --space <space>', 'Space key')
  .requiredOption('-t, --title <title>', 'Page title')
  .requiredOption('-c, --content <content>', 'Page content (HTML)')
  .option('-p, --parent <parent>', 'Parent page ID')
  .action(async (options) => {
    const logger = createConsoleLogger();
    
    try {
      const config = loadConfig();
      const client = new AtlassianMCPClient({ config, logger });
      
      await client.connect();
      
      const result = await client.createConfluencePage({
        spaceKey: options.space,
        title: options.title,
        content: options.content,
        parentId: options.parent
      });
      
      console.log(JSON.stringify(result, null, 2));
      
      await client.disconnect();
    } catch (error) {
      logger.error('Page creation failed:', error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = loadConfig();
      console.log('Configuration:');
      console.log(`- MCP Server URL: ${config.atlassian.mcpServerUrl}`);
      console.log(`- OAuth Client ID: ${config.atlassian.clientId ? '[SET]' : '[NOT SET]'}`);
      console.log(`- OAuth Scopes: ${config.atlassian.scopes.join(', ')}`);
      console.log(`- Rate Limit: ${config.rateLimit.maxRequestsPerHour} req/hour`);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Export for programmatic use
export { AtlassianMCPClient, loadConfig };
