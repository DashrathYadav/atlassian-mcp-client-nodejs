#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import { GeminiClient } from '../ai/gemini-client.js';
import { MCPToolRouter } from '../routing/tool-router.js';
import { MCPToolDispatcher } from '../routing/tool-dispatcher.js';
import { AtlassianMCPClient } from '../client/atlassian-mcp-client.js';

// Load environment variables
dotenv.config();

interface ConversationContext {
  history: Array<{
    userQuery: string;
    aiResponse: string;
    timestamp: Date;
  }>;
  currentSession: string;
}

export class AIAtlassianCLI {
  private gemini: GeminiClient;
  private router: MCPToolRouter;
  private mcpClient: AtlassianMCPClient;
  private dispatcher: MCPToolDispatcher;
  private context: ConversationContext;

  constructor() {
    const geminiApiKey = process.env['GEMINI_API_KEY'];
    if (!geminiApiKey) {
      console.error(chalk.red('❌ GEMINI_API_KEY not found in environment variables'));
      console.log(chalk.yellow('Please add your Gemini API key to .env file:'));
      console.log(chalk.gray('GEMINI_API_KEY=your-api-key-here'));
      process.exit(1);
    }

    this.gemini = new GeminiClient(geminiApiKey);
    this.router = new MCPToolRouter();
    this.mcpClient = new AtlassianMCPClient();
    this.dispatcher = new MCPToolDispatcher(this.mcpClient);
    this.context = {
      history: [],
      currentSession: new Date().toISOString()
    };
  }

  async start(): Promise<void> {
    console.log(chalk.blue.bold('🤖 AI-Powered Atlassian Assistant'));
    console.log(chalk.gray('Connecting to services...'));

    // Test connections
    const spinner = ora('Testing Gemini AI connection...').start();
    const geminiOk = await this.gemini.testConnection();
    if (!geminiOk) {
      spinner.fail('Failed to connect to Gemini AI');
      return;
    }
    spinner.succeed('Gemini AI connected');

    const mcpSpinner = ora('Connecting to Atlassian MCP...').start();
    try {
      await this.mcpClient.connect();
      mcpSpinner.succeed('Atlassian MCP connected');
    } catch (error) {
      mcpSpinner.fail(`Failed to connect to Atlassian MCP: ${error}`);
      return;
    }

    console.log();
    console.log(chalk.green('✅ All systems ready! You can now ask questions about Jira and Confluence.'));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.gray('  • "Show me all open tickets"'));
    console.log(chalk.gray('  • "Get details for ticket MD-1"'));
    console.log(chalk.gray('  • "List all projects"'));
    console.log(chalk.gray('  • Type "help" for more commands'));
    console.log();

    await this.startInteractiveSession();
  }

  private async startInteractiveSession(): Promise<void> {
    while (true) {
      try {
        const { query } = await inquirer.prompt([
          {
            type: 'input',
            name: 'query',
            message: chalk.cyan('🤖 You:'),
            prefix: '',
          }
        ]);

        const trimmedQuery = query.trim();
        
        if (!trimmedQuery) continue;
        
        // Handle special commands
        if (this.handleSpecialCommands(trimmedQuery)) {
          continue;
        }

        await this.processQuery(trimmedQuery);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') {
          break;
        }
        console.error(chalk.red('Error in interactive session:'), error);
      }
    }

    await this.cleanup();
  }

  private handleSpecialCommands(query: string): boolean {
    const command = query.toLowerCase();
    
    switch (command) {
      case 'exit':
      case 'quit':
      case 'bye':
        console.log(chalk.green('👋 Goodbye! Have a productive day!'));
        process.exit(0);
        
      case 'help':
        this.showHelp();
        return true;
        
      case 'history':
        this.showHistory();
        return true;
        
      case 'clear':
        console.clear();
        console.log(chalk.blue.bold('🤖 AI-Powered Atlassian Assistant'));
        console.log(chalk.green('Ready for your questions!'));
        return true;
        
      case 'tools':
        this.showAvailableTools();
        return true;
        
      default:
        return false;
    }
  }

  private async processQuery(userQuery: string): Promise<void> {
    const spinner = ora('🧠 Understanding your query...').start();
    
    try {
      // Step 1: Parse query with Gemini
      spinner.text = '🧠 Analyzing query with AI...';
      const aiResponse = await this.gemini.parseQuery(userQuery);
      
      // Step 2: Route to MCP tool
      spinner.text = '🔄 Routing to appropriate tool...';
      const toolCall = this.router.routeToTool(aiResponse.intent, aiResponse.toolParameters);
      
      // Step 3: Execute MCP tool
      spinner.text = `🛠️  Calling ${toolCall.toolName}...`;
      const mcpResult = await this.dispatcher.callTool(toolCall.toolName, toolCall.parameters);
      
      // Step 4: Format response with AI
      spinner.text = '✨ Formatting response...';
      const formattedResponse = await this.gemini.formatResponse(
        mcpResult, 
        aiResponse.intent.action, 
        userQuery
      );
      
      spinner.succeed('✅ Complete!');
      
      // Display the response
      console.log();
      console.log(chalk.white(formattedResponse));
      console.log();
      
      // Store in conversation history
      this.context.history.push({
        userQuery,
        aiResponse: formattedResponse,
        timestamp: new Date()
      });
      
    } catch (error) {
      spinner.fail('❌ Error processing query');
      console.error(chalk.red('Error:'), error);
      console.log(chalk.yellow('💡 Try rephrasing your question or type "help" for examples.'));
    }
  }

  private showHelp(): void {
    console.log(chalk.blue.bold('\n📖 Help - Available Commands'));
    console.log(chalk.gray('================================='));
    
    console.log(chalk.white('\n🎯 Query Examples:'));
    console.log(chalk.gray('  • "Show me all open tickets"'));
    console.log(chalk.gray('  • "Get details for ticket MD-1"'));
    console.log(chalk.gray('  • "List all projects"'));
    console.log(chalk.gray('  • "Find high priority bugs"'));
    console.log(chalk.gray('  • "Search for tickets about login"'));
    
    console.log(chalk.white('\n⚡ Special Commands:'));
    console.log(chalk.gray('  • help     - Show this help'));
    console.log(chalk.gray('  • history  - Show conversation history'));
    console.log(chalk.gray('  • clear    - Clear screen'));
    console.log(chalk.gray('  • tools    - Show available MCP tools'));
    console.log(chalk.gray('  • exit     - Exit the application'));
    console.log();
  }

  private showHistory(): void {
    console.log(chalk.blue.bold('\n📜 Conversation History'));
    console.log(chalk.gray('========================'));
    
    if (this.context.history.length === 0) {
      console.log(chalk.gray('No conversation history yet.'));
      return;
    }
    
    this.context.history.slice(-5).forEach((entry, index) => {
      console.log(chalk.cyan(`\n${index + 1}. You: ${entry.userQuery}`));
      console.log(chalk.white(`   AI: ${entry.aiResponse.slice(0, 100)}...`));
      console.log(chalk.gray(`   Time: ${entry.timestamp.toLocaleTimeString()}`));
    });
    console.log();
  }

  private showAvailableTools(): void {
    console.log(chalk.blue.bold('\n🛠️  Available MCP Tools'));
    console.log(chalk.gray('======================='));
    
    const tools = this.router.getAvailableTools();
    tools.forEach(tool => {
      console.log(chalk.white(`  • ${tool}`));
    });
    console.log();
  }

  private async cleanup(): Promise<void> {
    console.log(chalk.yellow('Cleaning up connections...'));
    try {
      await this.mcpClient.disconnect();
      console.log(chalk.green('✅ Cleanup complete'));
    } catch (error) {
      console.error(chalk.red('Error during cleanup:'), error);
    }
  }
}

// CLI Setup with Commander
const program = new Command();

program
  .name('ai-atlassian')
  .description('AI-powered natural language interface for Atlassian (Jira & Confluence)')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive AI chat session')
  .action(async () => {
    const cli = new AIAtlassianCLI();
    await cli.start();
  });

program
  .command('query <question>')
  .description('Ask a single question and get response')
  .action(async (question: string) => {
    console.log(chalk.blue('Single query mode coming soon...'));
    console.log(chalk.gray('Question:', question));
    console.log(chalk.gray('For now, use the interactive mode with:'));
    console.log(chalk.white('npx tsx src/cli/ai-cli.ts chat'));
  });

// Default action is to start chat
if (process.argv.length === 2) {
  const cli = new AIAtlassianCLI();
  cli.start().catch(console.error);
} else {
  program.parse();
}

export default AIAtlassianCLI;
