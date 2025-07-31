import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import { EnhancedAI, AIAnalysis, UIAction, ExecutionContext, ToolInfo } from '../ai/enhanced-ai';
import { AtlassianMCPClient } from '../client/atlassian-mcp-client';

// Load environment variables
dotenv.config();

export interface ExecutionHistory {
    queryId: string;
    originalQuery: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed' | 'paused';
    steps: ExecutionStep[];
    context: ExecutionContext;
    userInteractions: UserInteraction[];
}

export interface ExecutionStep {
    stepNumber: number;
    timestamp: Date;
    action: {
        tool: string;
        parameters: any;
        reasoning: string;
    };
    result: {
        success: boolean;
        data: any;
        error?: string;
        duration: number;
    };
    aiDecision: {
        nextAction: string;
        reasoning: string;
        confidence: number;
    };
}

export interface UserInteraction {
    timestamp: Date;
    type: 'execute_ai_recommendation' | 'choose_alternative' | 'modify_parameters' | 'pause_and_analyze' | 'stop_execution';
    details: any;
}

export class EnhancedInteractiveCLI {
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
        console.log(chalk.blue.bold('🤖 Enhanced AI-Powered Atlassian MCP Client'));
        console.log(chalk.gray('=============================================='));

        try {
            // Connect to MCP server
            const spinner = ora('🔌 Connecting to Atlassian MCP server...').start();
            await this.mcpClient.connect();
            spinner.succeed('✅ Connected to Atlassian MCP server');

            // Get available tools
            spinner.text = '📋 Fetching available tools...';
            spinner.start();
            const tools = await this.mcpClient.listTools();
            this.availableTools = tools.map(tool => ({
                name: tool.name,
                description: tool.description || 'No description available'
            }));
            spinner.succeed(`✅ Found ${this.availableTools.length} available tools`);

            // Start interactive session
            await this.startInteractiveSession();

        } catch (error) {
            console.error(chalk.red('❌ Failed to start enhanced CLI:'), error);
            throw error;
        } finally {
            await this.mcpClient.disconnect();
        }
    }

    private async startInteractiveSession(): Promise<void> {
        console.log(chalk.cyan('\n🎯 Enhanced AI-Powered Multi-Step Execution'));
        console.log(chalk.gray('The AI will guide you through complex queries with real-time decision making.\n'));

        while (true) {
            try {
                const { query } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'query',
                        message: chalk.blue('What would you like to do? (type "exit" to quit)'),
                        validate: (input: string) => {
                            if (!input.trim()) {
                                return 'Please enter a query';
                            }
                            return true;
                        }
                    }
                ]);

                if (query.toLowerCase() === 'exit') {
                    console.log(chalk.yellow('👋 Goodbye!'));
                    break;
                }

                // Execute enhanced multi-step query
                await this.executeEnhancedQuery(query);

            } catch (error) {
                console.error(chalk.red('❌ Error in interactive session:'), error);
                console.log(chalk.yellow('💡 Try rephrasing your question or type "exit" to quit.'));
            }
        }
    }

    private async executeEnhancedQuery(userQuery: string): Promise<void> {
        // Initialize execution history
        this.executionHistory = this.initializeExecutionHistory(userQuery);

        let iterationCount = 0;
        const maxIterations = 50; // Prevent infinite loops

        console.log(chalk.blue.bold(`\n🚀 Starting enhanced execution for: "${userQuery}"`));

        while (!this.isComplete(this.executionHistory) && iterationCount < maxIterations) {
            iterationCount++;
            this.executionHistory.context.iterationCount = iterationCount;

            try {
                // 1. AI Context Analysis
                const aiAnalysis = await this.ai.analyzeContext(this.executionHistory);

                // 2. AI Strategy Optimization (after first iteration)
                if (iterationCount > 1) {
                    const optimization = await this.ai.optimizeStrategy(this.executionHistory);
                    if (optimization.shouldChangeStrategy) {
                        console.log(chalk.yellow(`🔄 AI detected better strategy: ${optimization.reasoning}`));
                        this.executionHistory.context.strategy = optimization.newStrategy || this.executionHistory.context.strategy;
                    }
                }

                // 3. AI Next Action Suggestion
                const suggestedAction = await this.ai.suggestNextAction(this.executionHistory.context);

                // 4. Show Enhanced Dashboard
                const userChoice = await this.showEnhancedDashboard(suggestedAction, aiAnalysis);

                // 5. Execute Based on User Choice
                let actionToExecute = suggestedAction;

                switch (userChoice.type) {
                    case 'execute_ai_recommendation':
                        actionToExecute = suggestedAction;
                        break;

                    case 'choose_alternative':
                        if (userChoice.selectedAction) {
                            actionToExecute = userChoice.selectedAction;
                        }
                        break;

                    case 'modify_parameters':
                        actionToExecute = await this.modifyActionParameters(suggestedAction);
                        break;

                    case 'pause_and_analyze':
                        await this.performDeepAnalysis();
                        continue;

                    case 'stop_execution':
                        this.executionHistory.status = 'failed';
                        console.log(chalk.yellow('⏹️ Execution stopped by user'));
                        return;
                }

                // 6. Execute Action with AI Monitoring
                const result = await this.executeWithAIMonitoring(actionToExecute);

                // 7. AI Result Validation
                const validation = await this.ai.validateResult(actionToExecute, result);

                if (!validation.isValid) {
                    console.log(chalk.red(`⚠️ AI detected issue: ${validation.issues.join(', ')}`));

                    // AI suggests recovery action
                    const recoveryAction = await this.ai.suggestRecoveryAction(validation, this.executionHistory);
                    if (recoveryAction) {
                        console.log(chalk.yellow(`🔄 AI suggests recovery: ${recoveryAction.reasoning}`));
                        const recoveryResult = await this.executeWithAIMonitoring(recoveryAction);
                        this.updateExecutionHistory(recoveryAction, recoveryResult);
                    }
                }

                // 8. Update History and Generate Insights
                this.updateExecutionHistory(actionToExecute, result);

                // 9. AI Insight Generation
                const insights = await this.ai.generateInsights(this.executionHistory.context.accumulatedData);
                this.executionHistory.context.insights.push(...insights);

                // 10. Check for Completion
                const completionCheck = await this.ai.checkCompletion(this.executionHistory);
                if (completionCheck.isComplete) {
                    this.executionHistory.status = 'completed';
                    this.executionHistory.endTime = new Date();
                    console.log(chalk.green(`✅ Execution completed: ${completionCheck.reason}`));
                    break;
                }

            } catch (error) {
                console.error(chalk.red(`❌ Error in iteration ${iterationCount}:`), error);
                this.executionHistory.status = 'failed';
                break;
            }
        }

        // Generate final summary
        await this.generateFinalSummary();
    }

    private initializeExecutionHistory(userQuery: string): ExecutionHistory {
        return {
            queryId: `query_${Date.now()}`,
            originalQuery: userQuery,
            startTime: new Date(),
            status: 'running',
            steps: [],
            context: {
                variables: {},
                accumulatedData: [],
                availableTools: this.availableTools,
                iterationCount: 0,
                strategy: 'initial',
                progress: {
                    completed: 0,
                    total: 0,
                    percentage: 0
                },
                insights: []
            },
            userInteractions: []
        };
    }

    private async showEnhancedDashboard(
        suggestedAction: UIAction,
        aiAnalysis: AIAnalysis
    ): Promise<{ type: string; selectedAction?: UIAction }> {
        console.clear();

        // Header
        console.log(chalk.blue.bold('🤖 AI-Powered Multi-Step Execution'));
        console.log(chalk.gray('====================================='));

        // Progress
        console.log(chalk.cyan(`Query: ${this.executionHistory!.originalQuery}`));
        console.log(chalk.yellow(`Step ${this.executionHistory!.steps.length + 1} | Iteration ${this.executionHistory!.context.iterationCount}`));
        console.log(chalk.green(`Progress: ${this.calculateProgress()}%`));

        // AI Analysis
        console.log(chalk.white('\n🧠 AI Analysis:'));
        console.log(chalk.gray(`Understanding: ${aiAnalysis.currentUnderstanding}`));
        console.log(chalk.gray(`Accomplished: ${aiAnalysis.accomplished}`));
        console.log(chalk.gray(`Remaining: ${aiAnalysis.remaining}`));
        console.log(chalk.gray(`Confidence: ${aiAnalysis.confidence}%`));

        // Current Data
        console.log(chalk.white('\n📊 Current Data:'));
        const recentData = this.executionHistory!.context.accumulatedData.slice(-3);
        if (recentData.length > 0) {
            recentData.forEach((data, index) => {
                console.log(chalk.cyan(`${index + 1}. ${data.type || 'Data'}:`));
                console.log(chalk.gray(JSON.stringify(data.summary || data, null, 2)));
            });
        } else {
            console.log(chalk.gray('No data accumulated yet'));
        }

        // AI Recommendation
        console.log(chalk.white('\n🎯 AI Recommendation:'));
        console.log(chalk.green(`${suggestedAction.label}`));
        console.log(chalk.gray(`Reasoning: ${suggestedAction.reasoning}`));
        console.log(chalk.gray(`Confidence: ${suggestedAction.confidence}%`));
        console.log(chalk.gray(`Tool: ${suggestedAction.tool}`));

        // Alternatives
        if (suggestedAction.alternatives && suggestedAction.alternatives.length > 0) {
            console.log(chalk.white('\n🔄 Alternative Actions:'));
            suggestedAction.alternatives.forEach((alt, index) => {
                console.log(chalk.cyan(`${index + 1}. ${alt.label}`));
                console.log(chalk.gray(`   ${alt.reasoning}`));
            });
        }

        // Insights
        if (this.executionHistory!.context.insights.length > 0) {
            console.log(chalk.white('\n💡 AI Insights:'));
            this.executionHistory!.context.insights.slice(-3).forEach(insight => {
                console.log(chalk.yellow(`• ${insight}`));
            });
        }

        // User Choices
        const choices = [
            { name: '✅ Execute AI recommendation', value: { type: 'execute_ai_recommendation' } },
            { name: '🔄 Choose alternative action', value: { type: 'choose_alternative' } },
            { name: '⚙️ Modify parameters', value: { type: 'modify_parameters' } },
            { name: '📊 Deep analysis', value: { type: 'pause_and_analyze' } },
            { name: '❌ Stop execution', value: { type: 'stop_execution' } }
        ];

        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'What would you like to do?',
                choices
            }
        ]);

        // Handle alternative selection
        if (choice.type === 'choose_alternative' && suggestedAction.alternatives && suggestedAction.alternatives.length > 0) {
            const { selectedAlternative } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedAlternative',
                    message: 'Choose an alternative action:',
                    choices: suggestedAction.alternatives.map((alt) => ({
                        name: alt.label,
                        value: alt
                    }))
                }
            ]);
            choice.selectedAction = selectedAlternative;
        }

        return choice;
    }

    private async modifyActionParameters(action: UIAction): Promise<UIAction> {
        console.log(chalk.blue('\n⚙️ Modify Action Parameters'));
        console.log(chalk.gray('Current parameters:'), JSON.stringify(action.parameters, null, 2));

        const { shouldModify } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldModify',
                message: 'Do you want to modify the parameters?',
                default: false
            }
        ]);

        if (!shouldModify) {
            return action;
        }

        // For now, return the original action
        // In a full implementation, you'd provide parameter editing UI
        console.log(chalk.yellow('Parameter modification not yet implemented'));
        return action;
    }

    private async performDeepAnalysis(): Promise<void> {
        console.log(chalk.blue('\n📊 Deep Analysis'));
        console.log(chalk.gray('==============='));

        // Show all accumulated data
        console.log(chalk.white('\n📋 Accumulated Data:'));
        this.executionHistory!.context.accumulatedData.forEach((data, index) => {
            console.log(chalk.cyan(`\n${index + 1}. ${data.type || 'Data'}:`));
            console.log(chalk.gray(JSON.stringify(data.content || data, null, 2)));
        });

        // Show variables
        console.log(chalk.white('\n🔧 Variables:'));
        Object.entries(this.executionHistory!.context.variables).forEach(([key, value]) => {
            console.log(chalk.cyan(`${key}:`), chalk.gray(JSON.stringify(value)));
        });

        // Show insights
        console.log(chalk.white('\n💡 AI Insights:'));
        this.executionHistory!.context.insights.forEach(insight => {
            console.log(chalk.yellow(`• ${insight}`));
        });

        await inquirer.prompt([
            {
                type: 'input',
                name: 'continue',
                message: 'Press Enter to continue execution...'
            }
        ]);
    }

    private async executeWithAIMonitoring(action: UIAction): Promise<any> {
        const spinner = ora(`🛠️ Executing: ${action.label}`).start();

        try {
            const startTime = Date.now();
            const result = await this.mcpClient.callTool(action.tool, action.parameters);
            const duration = Date.now() - startTime;

            spinner.succeed(`✅ Executed successfully (${duration}ms)`);

            return {
                success: true,
                data: result,
                duration
            };

        } catch (error) {
            spinner.fail(`❌ Execution failed: ${error}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration: 0
            };
        }
    }

    private updateExecutionHistory(action: UIAction, result: any): void {
        const step: ExecutionStep = {
            stepNumber: this.executionHistory!.steps.length + 1,
            timestamp: new Date(),
            action: {
                tool: action.tool,
                parameters: action.parameters,
                reasoning: action.reasoning
            },
            result: {
                success: result.success,
                data: result.data,
                error: result.error,
                duration: result.duration
            },
            aiDecision: {
                nextAction: action.label,
                reasoning: action.reasoning,
                confidence: action.confidence
            }
        };

        this.executionHistory!.steps.push(step);

        // Update accumulated data
        if (result.success && result.data) {
            this.executionHistory!.context.accumulatedData.push({
                type: action.tool,
                content: result.data,
                timestamp: new Date(),
                summary: this.createDataSummary(result.data)
            });
        }

        // Update progress
        this.executionHistory!.context.progress.completed = this.executionHistory!.steps.length;
        this.executionHistory!.context.progress.percentage = this.calculateProgress();
    }

    private createDataSummary(data: any): any {
        if (Array.isArray(data)) {
            return {
                count: data.length,
                type: 'array',
                sample: data.slice(0, 3)
            };
        } else if (typeof data === 'object') {
            return {
                keys: Object.keys(data),
                type: 'object',
                size: JSON.stringify(data).length
            };
        } else {
            return {
                type: typeof data,
                value: String(data).substring(0, 100)
            };
        }
    }

    private calculateProgress(): number {
        if (!this.executionHistory) return 0;

        const totalSteps = Math.max(this.executionHistory.steps.length + 1, 1);
        const completedSteps = this.executionHistory.steps.length;

        return Math.round((completedSteps / totalSteps) * 100);
    }

    private isComplete(history: ExecutionHistory): boolean {
        return history.status === 'completed' || history.status === 'failed';
    }

    private async generateFinalSummary(): Promise<void> {
        if (!this.executionHistory) return;

        console.log(chalk.blue.bold('\n📋 Execution Summary'));
        console.log(chalk.gray('=================='));

        console.log(chalk.cyan(`Query: ${this.executionHistory.originalQuery}`));
        console.log(chalk.cyan(`Status: ${this.executionHistory.status}`));
        console.log(chalk.cyan(`Duration: ${this.getDuration()}`));
        console.log(chalk.cyan(`Total Steps: ${this.executionHistory.steps.length}`));

        console.log(chalk.white('\n📊 Steps Executed:'));
        this.executionHistory.steps.forEach((step, index) => {
            console.log(chalk.cyan(`${index + 1}. ${step.action.tool}`));
            console.log(chalk.gray(`   ${step.action.reasoning}`));
            console.log(chalk.gray(`   Duration: ${step.result.duration}ms`));
            console.log(chalk.gray(`   Success: ${step.result.success ? '✅' : '❌'}`));
        });

        console.log(chalk.white('\n💡 Final Insights:'));
        this.executionHistory.context.insights.forEach(insight => {
            console.log(chalk.yellow(`• ${insight}`));
        });

        console.log(chalk.white('\n📈 Accumulated Data:'));
        this.executionHistory.context.accumulatedData.forEach((data, index) => {
            console.log(chalk.cyan(`${index + 1}. ${data.type}:`));
            console.log(chalk.gray(`   ${JSON.stringify(data.summary)}`));
        });
    }

    private getDuration(): string {
        if (!this.executionHistory || !this.executionHistory.endTime) {
            return 'In progress';
        }

        const duration = this.executionHistory.endTime.getTime() - this.executionHistory.startTime.getTime();
        const seconds = Math.round(duration / 1000);
        return `${seconds}s`;
    }
} 