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
                    if (step.tool) step.result = await this.mcpManager.callTool(step.tool, step.parameters || {});
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

    private createStepDecisionPrompt(context: ExecutionContext, availableTools: ToolInfo[]): string {
        const toolsList = availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
        const stepsSummary = context.steps.map(step => `${step.id}: ${step.reasoning} → ${step.status} ${step.result ? '(has result)' : ''}`).join('\n');
        const contextSummary = Object.entries(context.context).map(([key, value]) => `${key}: ${JSON.stringify(value).slice(0, 200)}...`).join('\n');
        return `You are an AI agent executing a multi-step plan. Decide what to do next.

ORIGINAL USER QUERY: "${context.userQuery}"

COMPLETED STEPS (${context.steps.length}/${this.maxSteps}):
${stepsSummary || 'No steps completed yet'}

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

IMPORTANT: Consider if you have enough information to answer the user's question. If yes, choose final_response.

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
        const contextSummary = Object.entries(context.context).map(([key, value]) => `${key}: ${JSON.stringify(value).slice(0, 300)}...`).join('\n\n');
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

Provide clear, actionable insights.`;
    }

    private async generateFinalResponse(context: ExecutionContext): Promise<string> {
        const resultsSummary = Object.entries(context.context).map(([key, value]) => `${key}: ${JSON.stringify(value).slice(0, 400)}...`).join('\n\n');
        const finalPrompt = `Generate a comprehensive final response for the user's query.

USER QUERY: "${context.userQuery}"

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
