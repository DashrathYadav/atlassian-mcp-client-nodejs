import { BedrockClient, ToolInfo } from './bedrock-client.js';
import { KnowledgeHubClient } from './knowledge-hub-client.js';
import { MultiServerMCPManager } from '../client/multi-server-mcp-manager.js';

export interface ExecutionStep {
    id: string;
    type: 'mcp_call' | 'knowledge_hub_query' | 'reasoning' | 'final_response';
    tool?: string;
    parameters?: Record<string, any>;
    query?: string;
    reasoning: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    timestamp: Date;
}

export interface ExecutionContext {
    userQuery: string;
    steps: ExecutionStep[];
    currentStepIndex: number;
    context: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    }>;
    stepHistory: Set<string>;
    consecutiveFailures: number;
    lastStepResult: any;
}

export interface StepDecision {
    type: 'mcp_call' | 'knowledge_hub_query' | 'reasoning' | 'final_response';
    tool?: string;
    parameters?: Record<string, any>;
    query?: string;
    reasoning: string;
    confidence: number;
}

export class SmartAgent {
    private bedrock: BedrockClient;
    private knowledgeHub?: KnowledgeHubClient;
    private mcpManager: MultiServerMCPManager;
    private maxSteps: number = 8;
    private maxConsecutiveFailures: number = 3;
    private maxSimilarSteps: number = 2;
    private minConfidenceForContinue: number = 0.7;

    constructor(
        bedrock: BedrockClient,
        mcpManager: MultiServerMCPManager,
        knowledgeHub?: KnowledgeHubClient
    ) {
        this.bedrock = bedrock;
        this.mcpManager = mcpManager;
        this.knowledgeHub = knowledgeHub;
    }

    async processQuery(userQuery: string): Promise<string> {
        const context: ExecutionContext = {
            userQuery,
            steps: [],
            currentStepIndex: 0,
            context: {},
            conversationHistory: [],
            stepHistory: new Set(),
            consecutiveFailures: 0,
            lastStepResult: null
        };
        try {
            while (context.currentStepIndex < this.maxSteps) {
                const shouldContinue = await this.executeNextStep(context);
                if (!shouldContinue) break;
                context.currentStepIndex++;
            }
            return await this.generateFinalResponse(context);
        } catch (error) {
            return `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
        }
    }

    private async executeNextStep(context: ExecutionContext): Promise<boolean> {
        if (this.shouldStopExecution(context)) return false;
        const stepDecision = await this.decideNextStep(context);
        if (stepDecision.type === 'final_response') return false;
        if (stepDecision.confidence < this.minConfidenceForContinue) return false;
        const stepSignature = this.createStepSignature(stepDecision);
        if (context.stepHistory.has(stepSignature)) return false;
        context.stepHistory.add(stepSignature);
        const step: ExecutionStep = {
            id: `step_${context.currentStepIndex + 1}`,
            type: stepDecision.type,
            tool: stepDecision.tool,
            parameters: stepDecision.parameters,
            query: stepDecision.query,
            reasoning: stepDecision.reasoning,
            status: 'executing',
            timestamp: new Date()
        };
        context.steps.push(step);
        try {
            switch (step.type) {
                case 'mcp_call':
                    if (step.tool) {
                        step.result = await this.mcpManager.callTool(step.tool, step.parameters || {});
                        // Analyze the result for completeness
                        const analysis = this.analyzeDataCompleteness(step.result, context.userQuery);
                        console.log(`Step ${step.id} result: ${analysis.dataType} (${analysis.itemCount} items) - Complete: ${analysis.isComplete}`);
                        if (!analysis.isComplete) {
                            console.log(`⚠️  Data may be incomplete: ${analysis.suggestions.join(', ')}`);
                        }
                    }
                    break;
                case 'knowledge_hub_query':
                    if (step.query && this.knowledgeHub) {
                        const response = await this.knowledgeHub.query(step.query);
                        step.result = response.result;
                    }
                    break;
                case 'reasoning':
                    step.result = await this.performReasoning(step, context);
                    break;
                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }
            step.status = 'completed';
            context.consecutiveFailures = 0;
            context.lastStepResult = step.result;
            // Store result with step ID for better organization
            context.context[step.id] = step.result;
        } catch (error) {
            step.status = 'failed';
            step.error = error instanceof Error ? error.message : 'Unknown error';
            context.consecutiveFailures++;
        }
        return true;
    }

    private shouldStopExecution(context: ExecutionContext): boolean {
        if (context.consecutiveFailures >= this.maxConsecutiveFailures) return true;
        if (context.currentStepIndex >= this.maxSteps) return true;
        const recentSteps = context.steps.slice(-this.maxSimilarSteps);
        if (recentSteps.length >= this.maxSimilarSteps) {
            const allSimilar = recentSteps.every(step => step.type === recentSteps[0].type && step.tool === recentSteps[0].tool);
            if (allSimilar) return true;
        }
        return false;
    }

    private createStepSignature(decision: StepDecision): string {
        return `${decision.type}:${decision.tool || ''}:${decision.query || ''}:${JSON.stringify(decision.parameters || {})}`;
    }

    private async decideNextStep(context: ExecutionContext): Promise<StepDecision> {
        const availableTools = this.mcpManager.getAllTools();
        const prompt = this.createStepDecisionPrompt(context, availableTools);
        try {
            const response = await this.bedrock.invokeModel(prompt, {
                temperature: 0.1,
                max_tokens: 1000,
                top_p: 0.8
            });
            return this.parseStepDecision(response);
        } catch (error) {
            return {
                type: 'final_response',
                reasoning: 'Failed to decide next step, providing final response',
                confidence: 0.5
            };
        }
    }

    private analyzeDataCompleteness(data: any, query: string): {
        isComplete: boolean;
        itemCount: number;
        dataType: 'list' | 'object' | 'single' | 'unknown';
        hasPagination: boolean;
        suggestions: string[];
    } {
        const result = {
            isComplete: true,
            itemCount: 0,
            dataType: 'unknown' as const,
            hasPagination: false,
            suggestions: [] as string[]
        };

        try {
            const jsonStr = JSON.stringify(data);

            // Detect data type
            if (Array.isArray(data)) {
                result.dataType = 'list';
                result.itemCount = data.length;

                // Check for pagination indicators
                if (data.length > 0) {
                    const firstItem = data[0];
                    if (typeof firstItem === 'object' && firstItem !== null) {
                        // Look for pagination fields
                        const paginationFields = ['nextPageToken', 'nextCursor', 'hasMore', 'isLastPage', 'startAt', 'maxResults'];
                        const hasPaginationField = paginationFields.some(field =>
                            firstItem.hasOwnProperty(field) ||
                            (typeof firstItem === 'object' && firstItem !== null && Object.keys(firstItem).some(key =>
                                key.toLowerCase().includes('page') || key.toLowerCase().includes('cursor')
                            ))
                        );

                        if (hasPaginationField) {
                            result.hasPagination = true;
                            result.suggestions.push('Data may be paginated - consider additional queries for complete results');
                        }
                    }
                }

                // Check if this seems like a complete result
                if (query.toLowerCase().includes('all') && data.length <= 5) {
                    result.isComplete = false;
                    result.suggestions.push('Query asked for "all" but only a few items returned - may be incomplete');
                }

            } else if (typeof data === 'object' && data !== null) {
                result.dataType = 'object';

                // Check if it's a wrapper object with a list inside
                const keys = Object.keys(data);
                if (keys.length === 1 && Array.isArray(data[keys[0]])) {
                    result.dataType = 'list';
                    result.itemCount = data[keys[0]].length;
                } else if (keys.length > 10) {
                    result.dataType = 'object';
                    result.suggestions.push('Complex object with many fields - may contain nested data');
                }

                // Look for pagination metadata
                const paginationIndicators = ['totalCount', 'totalSize', 'hasMore', 'nextPage', 'isLastPage'];
                const hasPagination = paginationIndicators.some(indicator =>
                    keys.some(key => key.toLowerCase().includes(indicator.toLowerCase()))
                );

                if (hasPagination) {
                    result.hasPagination = true;
                    result.suggestions.push('Pagination metadata detected - data may be incomplete');
                }

            } else {
                result.dataType = 'single';
                result.itemCount = 1;
            }

        } catch (error) {
            result.suggestions.push('Error analyzing data structure');
        }

        return result;
    }

    private createStepDecisionPrompt(context: ExecutionContext, availableTools: ToolInfo[]): string {
        const toolsList = availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
        const stepsSummary = context.steps.map(step => `${step.id}: ${step.reasoning} → ${step.status} ${step.result ? '(has result)' : ''}`).join('\n');

        // Analyze data completeness for each step result
        const dataAnalysis = context.steps
            .filter(step => step.status === 'completed' && step.result)
            .map(step => {
                const analysis = this.analyzeDataCompleteness(step.result, context.userQuery);
                return `${step.id}: ${analysis.dataType} (${analysis.itemCount} items) - Complete: ${analysis.isComplete}${analysis.hasPagination ? ' - Has pagination' : ''}${analysis.suggestions.length > 0 ? ` - ${analysis.suggestions.join(', ')}` : ''}`;
            })
            .join('\n');

        // No truncation - show complete data
        const contextSummary = Object.entries(context.context).map(([key, value]) => {
            const jsonValue = JSON.stringify(value);
            return `${key}: ${jsonValue}`;
        }).join('\n');

        return `You are an AI agent executing a multi-step plan. Decide what to do next.

ORIGINAL USER QUERY: "${context.userQuery}"

COMPLETED STEPS (${context.steps.length}/${this.maxSteps}):
${stepsSummary || 'No steps completed yet'}

DATA COMPLETENESS ANALYSIS:
${dataAnalysis || 'No data analysis available'}

CURRENT CONTEXT:
${contextSummary || 'No context yet'}

AVAILABLE TOOLS:
${toolsList}

LOOP PREVENTION INFO:
- Consecutive failures: ${context.consecutiveFailures}/${this.maxConsecutiveFailures}
- Steps remaining: ${this.maxSteps - context.currentStepIndex}
- Recent step types: ${context.steps.slice(-3).map(s => s.type).join(', ')}

Your task is to decide the next step. You can:
1. Call an MCP tool to get more information
2. Query the Knowledge Hub for organizational knowledge
3. Perform reasoning based on current results
4. Provide final response if you have enough information

IMPORTANT GUIDELINES:
- For "get all" or "list all" requests: Check the data completeness analysis above
- If data analysis shows "incomplete" or "has pagination", consider additional queries
- For large datasets: Consider if you need to aggregate or get more information
- Look for patterns in the data that suggest pagination or incomplete results
- Consider if you have enough information to answer the user's question comprehensively

Respond with JSON:
{
  "type": "mcp_call|knowledge_hub_query|reasoning|final_response",
  "tool": "tool_name_if_mcp_call",
  "parameters": {"param": "value"},
  "query": "query_if_knowledge_hub",
  "reasoning": "Why this step is needed",
  "confidence": 0.0-1.0
}

Examples:
- If we found tickets but need assignee details → mcp_call with getJiraIssue
- If we need organizational knowledge → knowledge_hub_query
- If we have enough data → final_response (confidence: 0.9)
- If we need to analyze results → reasoning
- If pagination detected → consider additional tool calls for complete data

Be specific about what you want to achieve with this step.`;
    }

    private parseStepDecision(response: string): StepDecision {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? jsonMatch[0] : response;
            const parsed = JSON.parse(jsonText);
            return {
                type: parsed.type || 'final_response',
                tool: parsed.tool,
                parameters: parsed.parameters || {},
                query: parsed.query,
                reasoning: parsed.reasoning || 'No reasoning provided',
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
            };
        } catch (error) {
            return {
                type: 'final_response',
                reasoning: 'Failed to parse decision, providing final response',
                confidence: 0.5
            };
        }
    }

    private async performReasoning(step: ExecutionStep, context: ExecutionContext): Promise<string> {
        const reasoningPrompt = this.createReasoningPrompt(step, context);
        const response = await this.bedrock.invokeModel(reasoningPrompt, {
            temperature: 0.3,
            max_tokens: 1000,
            top_p: 0.9
        });
        return response;
    }

    private createReasoningPrompt(step: ExecutionStep, context: ExecutionContext): string {
        // No truncation - show complete data
        const contextSummary = Object.entries(context.context).map(([key, value]) => {
            const jsonValue = JSON.stringify(value);
            return `${key}: ${jsonValue}`;
        }).join('\n\n');

        return `You are performing reasoning for: ${step.reasoning}

User Query: "${context.userQuery}"

Current Context:
${contextSummary}

Based on the current context and the reasoning task, provide your analysis and insights.

Consider:
- What patterns do you see in the data?
- What conclusions can you draw?
- What additional information might be needed?
- How does this relate to the user's original question?
- For list/array data: How many items are shown and does this seem complete?
- For "get all" requests: Does the data appear to represent everything requested?

Data Analysis Guidelines:
- Count items in arrays/lists if present
- Identify patterns in the data structure
- Consider if this represents all requested data or just a subset
- Look for pagination indicators or continuation tokens

Provide clear, actionable insights.`;
    }

    private aggregateStepResults(context: ExecutionContext): {
        aggregatedData: Record<string, any>;
        summary: string;
        totalItems: number;
        dataTypes: string[];
    } {
        const aggregatedData: Record<string, any> = {};
        const dataTypes: string[] = [];
        let totalItems = 0;

        // Aggregate results from all completed steps
        context.steps
            .filter(step => step.status === 'completed' && step.result)
            .forEach((step, index) => {
                const stepKey = `step_${index + 1}_${step.type}`;
                aggregatedData[stepKey] = step.result;

                // Analyze the data
                const analysis = this.analyzeDataCompleteness(step.result, context.userQuery);
                dataTypes.push(`${analysis.dataType} (${analysis.itemCount} items)`);
                totalItems += analysis.itemCount;

                // If it's a list, try to merge with existing lists
                if (analysis.dataType === 'list' && Array.isArray(step.result)) {
                    const existingListKey = Object.keys(aggregatedData).find(key =>
                        key !== stepKey && Array.isArray(aggregatedData[key])
                    );

                    if (existingListKey) {
                        // Merge lists
                        aggregatedData[existingListKey] = [...aggregatedData[existingListKey], ...step.result];
                        delete aggregatedData[stepKey];
                    }
                }
            });

        // Create a summary
        const summary = `Aggregated ${context.steps.filter(s => s.status === 'completed').length} steps: ${dataTypes.join(', ')} - Total items: ${totalItems}`;

        return {
            aggregatedData,
            summary,
            totalItems,
            dataTypes
        };
    }

    private async generateFinalResponse(context: ExecutionContext): Promise<string> {
        // Aggregate data from all steps
        const aggregation = this.aggregateStepResults(context);

        // No truncation - show complete data
        const resultsSummary = Object.entries(aggregation.aggregatedData).map(([key, value]) => {
            const jsonValue = JSON.stringify(value);
            return `${key}: ${jsonValue}`;
        }).join('\n\n');

        const finalPrompt = `Generate a comprehensive final response for the user's query.

USER QUERY: "${context.userQuery}"

DATA AGGREGATION SUMMARY:
${aggregation.summary}
- Total items found: ${aggregation.totalItems}
- Data types: ${aggregation.dataTypes.join(', ')}

EXECUTION RESULTS:
${resultsSummary}

EXECUTION STEPS:
${context.steps.map(step => `${step.id}: ${step.reasoning} (${step.status})`).join('\n')}

EXECUTION SUMMARY:
- Total steps: ${context.steps.length}
- Successful steps: ${context.steps.filter(s => s.status === 'completed').length}
- Failed steps: ${context.steps.filter(s => s.status === 'failed').length}
- Consecutive failures: ${context.consecutiveFailures}

Create a well-formatted, helpful response that:
- Directly answers the user's question
- Synthesizes information from all steps
- Provides actionable insights
- Uses clear formatting and structure
- Includes relevant details from the execution
- Acknowledges any failed steps but provides what information you do have

Data Completeness Guidelines:
- Clearly state how many items were found (total: ${aggregation.totalItems})
- For "get all" requests: Explain if the results appear complete or partial
- If only a subset is shown but the user asked for "all", explain this clearly
- Suggest if additional queries might be needed to get complete information
- Provide a summary of what was found and any patterns observed
- Use the aggregation summary to provide a comprehensive overview

Make the response conversational and informative.`;
        const response = await this.bedrock.invokeModel(finalPrompt, {
            temperature: 0.3,
            max_tokens: 2000,
            top_p: 0.9
        });
        return response;
    }

    updateLoopPreventionSettings(settings: {
        maxSteps?: number;
        maxConsecutiveFailures?: number;
        maxSimilarSteps?: number;
        minConfidenceForContinue?: number;
    }): void {
        if (settings.maxSteps !== undefined) this.maxSteps = settings.maxSteps;
        if (settings.maxConsecutiveFailures !== undefined) this.maxConsecutiveFailures = settings.maxConsecutiveFailures;
        if (settings.maxSimilarSteps !== undefined) this.maxSimilarSteps = settings.maxSimilarSteps;
        if (settings.minConfidenceForContinue !== undefined) this.minConfidenceForContinue = settings.minConfidenceForContinue;
    }
}
