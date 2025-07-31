#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import { GeminiClient } from '../ai/gemini-client.js';

// Load environment variables
dotenv.config();

async function testSimplifiedGeminiIntegration() {
  console.log(chalk.blue.bold('🧪 Testing Simplified Gemini AI Integration'));
  console.log(chalk.gray('=============================================='));

  const geminiApiKey = process.env['GEMINI_API_KEY'];
  if (!geminiApiKey) {
    console.error(chalk.red('❌ GEMINI_API_KEY not found in environment variables'));
    console.log(chalk.yellow('Please add your Gemini API key to .env file:'));
    console.log(chalk.gray('GEMINI_API_KEY=your-api-key-here'));
    return;
  }

  // Test 1: Basic Gemini connection
  console.log(chalk.yellow('\n1. Testing Gemini AI connection...'));
  const gemini = new GeminiClient(geminiApiKey);
  const connectionOk = await gemini.testConnection();

  if (!connectionOk) {
    console.error(chalk.red('❌ Failed to connect to Gemini AI'));
    return;
  }

  // Test 2: Query analysis with mock tools
  console.log(chalk.yellow('\n2. Testing query analysis...'));
  const mockTools = [
    { name: 'searchJiraIssuesUsingJql', description: 'Search Jira issues using JQL query' },
    { name: 'getJiraIssue', description: 'Get specific ticket details by ID or key' },
    { name: 'getVisibleJiraProjects', description: 'List all accessible Jira projects' },
    { name: 'getConfluenceSpaces', description: 'List all accessible Confluence spaces' },
    { name: 'searchConfluenceUsingCql', description: 'Search Confluence content using CQL' }
  ];

  const testQueries = [
    'show me all open tickets',
    'get details for ticket MD-1',
    'list all projects',
    'find high priority bugs',
    'hello there',
    'what can you do?'
  ];

  for (const query of testQueries) {
    try {
      console.log(chalk.cyan(`\nQuery: "${query}"`));
      const analysis = await gemini.analyzeQuery(query, mockTools);

      console.log(chalk.green('✅ Analysis successful:'));
      console.log(chalk.gray(`  Should call tool: ${analysis.shouldCallTool}`));
      if (analysis.toolName) {
        console.log(chalk.gray(`  Tool: ${analysis.toolName}`));
        console.log(chalk.gray(`  Parameters: ${JSON.stringify(analysis.parameters)}`));
      }
      if (analysis.response) {
        console.log(chalk.gray(`  Direct response: ${analysis.response}`));
      }
      console.log(chalk.gray(`  Reasoning: ${analysis.reasoning}`));

    } catch (error) {
      console.error(chalk.red(`❌ Error analyzing query "${query}":`, error));
    }
  }

  // Test 3: Response formatting
  console.log(chalk.yellow('\n3. Testing response formatting...'));
  const mockJiraData = {
    issues: [
      {
        key: 'MD-1',
        fields: {
          summary: 'Do the Research on Jira mcp server',
          status: { name: 'To Do' },
          priority: { name: 'Highest' },
          assignee: null,
          created: '2025-01-28T10:00:00.000+0000'
        }
      }
    ]
  };

  try {
    const formattedResponse = await gemini.formatResponse(
      mockJiraData,
      'show me all open tickets'
    );

    console.log(chalk.green('✅ Response formatted successfully:'));
    console.log(chalk.white(formattedResponse));
  } catch (error) {
    console.error(chalk.red('❌ Error formatting response:', error));
  }

  console.log(chalk.green.bold('\n🎉 Simplified Gemini AI integration test complete!'));
  console.log(chalk.gray('You can now run the simplified AI CLI with:'));
  console.log(chalk.white('npm run ai'));
}

// Run the test
testSimplifiedGeminiIntegration().catch(console.error);
