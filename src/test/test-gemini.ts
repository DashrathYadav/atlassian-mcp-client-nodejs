#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import { GeminiClient } from '../ai/gemini-client.js';
import { MCPToolRouter } from '../routing/tool-router.js';

// Load environment variables
dotenv.config();

async function testGeminiIntegration() {
  console.log(chalk.blue.bold('🧪 Testing Gemini AI Integration'));
  console.log(chalk.gray('================================'));
  
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

  // Test 2: Query parsing
  console.log(chalk.yellow('\n2. Testing query parsing...'));
  const testQueries = [
    'show me all open tickets',
    'get details for ticket MD-1',
    'list all projects',
    'find high priority bugs'
  ];

  for (const query of testQueries) {
    try {
      console.log(chalk.cyan(`\nQuery: "${query}"`));
      const aiResponse = await gemini.parseQuery(query);
      
      console.log(chalk.green('✅ Parsed successfully:'));
      console.log(chalk.gray(`  Action: ${aiResponse.intent.action}`));
      console.log(chalk.gray(`  Entity: ${aiResponse.intent.entity}`));
      console.log(chalk.gray(`  Tool: ${aiResponse.suggestedTool}`));
      console.log(chalk.gray(`  Confidence: ${aiResponse.intent.confidence}`));
      
      // Test tool routing
      const router = new MCPToolRouter();
      const toolCall = router.routeToTool(aiResponse.intent, aiResponse.toolParameters);
      console.log(chalk.blue(`  → Routed to: ${toolCall.toolName}`));
      console.log(chalk.gray(`  → Parameters: ${JSON.stringify(toolCall.parameters, null, 2)}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error parsing query "${query}":`, error));
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
      'search',
      'show me all open tickets'
    );
    
    console.log(chalk.green('✅ Response formatted successfully:'));
    console.log(chalk.white(formattedResponse));
  } catch (error) {
    console.error(chalk.red('❌ Error formatting response:', error));
  }

  console.log(chalk.green.bold('\n🎉 Gemini AI integration test complete!'));
  console.log(chalk.gray('You can now run the full AI CLI with:'));
  console.log(chalk.white('npm run ai'));
}

// Run the test
testGeminiIntegration().catch(console.error);
