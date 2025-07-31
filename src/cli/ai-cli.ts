#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import { BedrockClient, ToolInfo, BedrockConfig } from '../ai/bedrock-client.js';
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

export class SimpleAIAtlassianCLI {
  private bedrock: BedrockClient;
  private mcpClient: AtlassianMCPClient;
  private context: ConversationContext;
  private availableTools: ToolInfo[] = [];

  constructor() {
    const region = process.env['AWS_REGION'] || 'ap-south-1';
    const accessKeyId = process.env['AWS_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];

    if (!accessKeyId || !secretAccessKey) {
      console.error(chalk.red('❌ AWS credentials not found in environment variables'));
      console.log(chalk.yellow('Please add your AWS credentials to .env file:'));
      console.log(chalk.gray('AWS_ACCESS_KEY_ID=your-access-key'));
      console.log(chalk.gray('AWS_SECRET_ACCESS_KEY=your-secret-key'));
      console.log(chalk.gray('AWS_REGION=ap-south-1 (optional, defaults to ap-south-1)'));
      process.exit(1);
    }

    const config: BedrockConfig = {
      region,
      accessKeyId,
      secretAccessKey
    };

    this.bedrock = new BedrockClient(config);
    this.mcpClient = new AtlassianMCPClient();
    this.context = {
      history: [],
      currentSession: new Date().toISOString()
    };
  }

  async start(): Promise<void> {
    console.log(chalk.blue.bold('🤖 Simple AI-Powered Atlassian Assistant'));
    console.log(chalk.gray('Connecting to services...'));

    // Step 1: Test AWS Bedrock connection
    const spinner = ora('Testing AWS Bedrock connection...').start();
    const bedrockOk = await this.bedrock.testConnection();
    if (!bedrockOk) {
      spinner.fail('Failed to connect to AWS Bedrock');
      return;
    }
    spinner.succeed('AWS Bedrock connected');

    // Step 2: Connect to Atlassian MCP
    const mcpSpinner = ora('Connecting to Atlassian MCP...').start();
    try {
      await this.mcpClient.connect();
      mcpSpinner.succeed('Atlassian MCP connected');
    } catch (error) {
      mcpSpinner.fail(`Failed to connect to Atlassian MCP: ${error}`);
      return;
    }

    // Step 3: Get all available tools
    const toolsSpinner = ora('Loading available MCP tools...').start();
    try {
      const tools = await this.mcpClient.listTools();
      this.availableTools = tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || 'No description available'
      }));
      toolsSpinner.succeed(`Loaded ${this.availableTools.length} MCP tools`);
    } catch (error) {
      toolsSpinner.fail(`Failed to load tools: ${error}`);
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
        console.log(chalk.blue.bold('🤖 Simple AI-Powered Atlassian Assistant'));
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
    const spinner = ora('🧠 Analyzing your query...').start();

    try {
      // Step 1: Let AI analyze the query and decide what to do
      spinner.text = '🧠 AI is analyzing your request...';
      const analysis = await this.bedrock.analyzeQuery(userQuery, this.availableTools);

      spinner.succeed(`AI Analysis: ${analysis.reasoning}`);

      let finalResponse: string;

      if (analysis.shouldCallTool && analysis.toolName) {
        // Step 2: Call the MCP tool directly
        spinner.text = `🛠️  Calling ${analysis.toolName}...`;
        const toolResult = await this.mcpClient.callTool(analysis.toolName, analysis.parameters || {});

        // Step 3: Let AI format the response
        spinner.text = '✨ Formatting response...';
        finalResponse = await this.bedrock.formatResponse(toolResult, userQuery);
      } else {
        // No tool needed, use AI's direct response
        finalResponse = analysis.response || 'I understand your request but don\'t need to call any tools.';
      }

      // Display the response
      console.log();
      console.log(chalk.white(finalResponse));
      console.log();

      // Store in conversation history
      this.context.history.push({
        userQuery,
        aiResponse: finalResponse,
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
    console.log(chalk.gray('  • "Hello" or "What can you do?"'));

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

    this.availableTools.forEach(tool => {
      console.log(chalk.white(`  • ${tool.name}`));
      console.log(chalk.gray(`    ${tool.description}`));
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
  .name('simple-ai-atlassian')
  .description('Simple AI-powered natural language interface for Atlassian (Jira & Confluence)')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive AI chat session')
  .action(async () => {
    const cli = new SimpleAIAtlassianCLI();
    await cli.start();
  });

program
  .command('query <question>')
  .description('Ask a single question and get response')
  .action(async (question: string) => {
    console.log(chalk.blue('Single query mode coming soon...'));
    console.log(chalk.gray('Question:', question));
    console.log(chalk.gray('For now, use the interactive mode with:'));
    console.log(chalk.white('npm run ai'));
  });

// Default action is to start chat
if (process.argv.length === 2) {
  const cli = new SimpleAIAtlassianCLI();
  cli.start().catch(console.error);
} else {
  program.parse();
}

export default SimpleAIAtlassianCLI;
