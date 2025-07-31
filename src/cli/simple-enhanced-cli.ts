#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { EnhancedAI } from '../ai/enhanced-ai';
import { AtlassianMCPClient } from '../client/atlassian-mcp-client';

interface ToolInfo {
  name: string;
  description: string;
}

interface ExecutionStep {
  action: any;
  result: any;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
}

interface ExecutionHistory {
  query: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  steps: ExecutionStep[];
  context: {
    iterationCount: number;
    strategy: string;
    accumulatedData: any[];
    insights: string[];
  };
}

export class SimpleEnhancedCLI {
  private ai: EnhancedAI;
  private mcpClient: AtlassianMCPClient;
  private availableTools: ToolInfo[] = [];
  private executionHistory: ExecutionHistory | null = null;

  constructor() {
    if (!process.env['GEMINI_API_KEY']) {
      throw new Error('GEMINI_API_KEY is required. Please set it in your environment variables.');
    }

    this.ai = new EnhancedAI(process.env['GEMINI_API_KEY']);
    this.mcpClient = new AtlassianMCPClient();
  }

  async start(): Promise<void> {
    console.log(chalk.blue('🤖 Simple Enhanced AI-Powered Atlassian Assistant'));
    console.log(chalk.gray('==============================================\n'));

    // Connect to services
    const spinner = ora('🔌 Connecting to services...').start();
    
    try {
      // Test Gemini AI
      spinner.text = '🧠 Testing AI connection...';
      await this.ai.testConnection();
      spinner.succeed('✅ AI connected');

      // Connect to MCP
      spinner.text = '🔌 Connecting to Atlassian MCP...';
      await this.mcpClient.connect();
      spinner.succeed('✅ MCP connected');

      // Load tools
      spinner.text = '📋 Loading tools...';
      const tools = await this.mcpClient.listTools();
      this.availableTools = tools.map(tool => ({
        name: tool.name,
        description: tool.description || 'No description available'
      }));
      spinner.succeed(`✅ Loaded ${this.availableTools.length} tools`);

      console.log(chalk.green('\n✅ Ready! Ask me anything about Jira or Confluence.\n'));

      // Start interactive session
      await this.interactiveSession();

    } catch (error) {
      spinner.fail('❌ Failed to start');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  }

  private async interactiveSession(): Promise<void> {
    while (true) {
      try {
        const { userQuery } = await inquirer.prompt([
          {
            type: 'input',
            name: 'userQuery',
            message: chalk.blue('🤖 You:'),
            validate: (input: string) => {
              if (!input.trim()) return 'Please enter a query';
              if (input.toLowerCase() === 'exit') return true;
              return true;
            }
          }
        ]);

        if (userQuery.toLowerCase() === 'exit') {
          console.log(chalk.yellow('👋 Goodbye!'));
          break;
        }

        // Process the query with minimal user feedback
        await this.processQuery(userQuery);

      } catch (error) {
        console.error(chalk.red('❌ Error:'), error);
      }
    }
  }

  private async processQuery(userQuery: string): Promise<void> {
    const spinner = ora(chalk.blue('🤔 Thinking...')).start();
    
    try {
      // Initialize execution history
      this.executionHistory = {
        query: userQuery,
        status: 'running',
        startTime: new Date(),
        steps: [],
        context: {
          iterationCount: 0,
          strategy: 'direct_execution',
          accumulatedData: [],
          insights: []
        }
      };

      let iterationCount = 0;
      const maxIterations = 10;

      while (this.executionHistory.status === 'running' && iterationCount < maxIterations) {
        iterationCount++;
        this.executionHistory.context.iterationCount = iterationCount;

        // AI analyzes the current state
        const aiAnalysis = await this.ai.analyzeContext(this.executionHistory);
        
        // AI suggests next action
        const suggestedAction = await this.ai.suggestNextAction(this.executionHistory.context);
        
        // Execute the action silently
        const result = await this.executeActionSilently(suggestedAction);
        
        // Validate result
        const validation = await this.ai.validateResult(suggestedAction, result);
        
        if (!validation.isValid) {
          // Try recovery if needed
          const recoveryAction = await this.ai.suggestRecoveryAction(validation, this.executionHistory);
          if (recoveryAction) {
            const recoveryResult = await this.executeActionSilently(recoveryAction);
            this.updateExecutionHistory(recoveryAction, recoveryResult);
          }
        }

        // Update history
        this.updateExecutionHistory(suggestedAction, result);

        // Check if we're done
        const completionCheck = await this.ai.checkCompletion(this.executionHistory);
        if (completionCheck.isComplete) {
          this.executionHistory.status = 'completed';
          this.executionHistory.endTime = new Date();
          break;
        }

        // Generate insights
        const insights = await this.ai.generateInsights(this.executionHistory.context.accumulatedData);
        this.executionHistory.context.insights.push(...insights);
      }

      // Generate final response
      const finalResponse = await this.generateFinalResponse();
      
      spinner.succeed('✅ Done!');
      console.log(chalk.green('\n📋 Result:'));
      console.log(chalk.white(finalResponse));
      console.log();

    } catch (error) {
      spinner.fail('❌ Failed');
      console.error(chalk.red('Error:'), error);
    }
  }

  private async executeActionSilently(action: any): Promise<any> {
    try {
      const startTime = Date.now();
      const result = await this.mcpClient.callTool(action.toolName, action.parameters || {});
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        result,
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: 0
      };
    }
  }

  private updateExecutionHistory(action: any, result: any): void {
    if (!this.executionHistory) return;

    this.executionHistory.steps.push({
      action,
      result,
      timestamp: new Date(),
      duration: result.duration || 0,
      success: result.success,
      error: result.error
    });

    // Accumulate data
    if (result.success && result.result) {
      this.executionHistory.context.accumulatedData.push(result.result);
    }
  }

  private async generateFinalResponse(): Promise<string> {
    if (!this.executionHistory) return 'No execution history available.';

    const totalSteps = this.executionHistory.steps.length;
    const successfulSteps = this.executionHistory.steps.filter(step => step.success).length;
    const totalDuration = this.executionHistory.steps.reduce((sum, step) => sum + step.duration, 0);

    // Use AI to format the final response based on accumulated data
    const prompt = `
Based on the following execution data, provide a clear and concise response to the user's original query: "${this.executionHistory.query}"

Execution Summary:
- Total steps: ${totalSteps}
- Successful steps: ${successfulSteps}
- Total duration: ${totalDuration}ms
- Status: ${this.executionHistory.status}

Accumulated Data: ${JSON.stringify(this.executionHistory.context.accumulatedData, null, 2)}

Please provide a natural, helpful response that directly answers the user's question. Don't mention the technical execution details - just give them the information they asked for.
`;

    try {
      const response = await this.ai.generateResponse(prompt);
      return response;
    } catch (error) {
      // Fallback to simple data summary
      return this.createSimpleSummary();
    }
  }

  private createSimpleSummary(): string {
    if (!this.executionHistory) return 'No data available.';

    const data = this.executionHistory.context.accumulatedData;
    if (data.length === 0) {
      return 'I processed your request but found no relevant data to return.';
    }

    // Simple fallback summary
    return `I found ${data.length} items related to your query. Here's what I discovered:\n\n${JSON.stringify(data, null, 2)}`;
  }
} 