import { MultiServerMCPManager } from '../client/multi-server-mcp-manager.js';
import { KnowledgeHubClient } from '../ai/knowledge-hub-client.js';
import { BedrockClient } from '../ai/bedrock-client.js';
import { SmartAgent } from '../ai/smart-agent.js';

export interface SmartDispatcherConfig {
    useSmartAgent: boolean;
    maxSteps: number;
    maxConsecutiveFailures: number;
    minConfidenceForContinue: number;
}

export class SmartDispatcher {
    private smartAgent: SmartAgent;
    private useSmartAgent: boolean;

    constructor(
        private mcpManager: MultiServerMCPManager,
        private knowledgeHub: KnowledgeHubClient,
        private bedrock: BedrockClient,
        config: SmartDispatcherConfig = {
            useSmartAgent: true,
            maxSteps: 8,
            maxConsecutiveFailures: 3,
            minConfidenceForContinue: 0.7
        }
    ) {
        this.smartAgent = new SmartAgent(bedrock, mcpManager, knowledgeHub);
        this.useSmartAgent = config.useSmartAgent;
        this.smartAgent.updateLoopPreventionSettings({
            maxSteps: config.maxSteps,
            maxConsecutiveFailures: config.maxConsecutiveFailures,
            minConfidenceForContinue: config.minConfidenceForContinue
        });
    }

    async processQuery(userQuery: string): Promise<string> {
        try {
            if (this.useSmartAgent) {
                return await this.smartAgent.processQuery(userQuery);
            } else {
                return await this.processSimpleQuery(userQuery);
            }
        } catch (error) {
            return `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
        }
    }

    private async processSimpleQuery(userQuery: string): Promise<string> {
        const analysis = await this.analyzeSimpleQuery(userQuery);
        let result: any;
        if (analysis.shouldCallKnowledgeHub && analysis.knowledgeHubQuery) {
            const khResponse = await this.knowledgeHub.query(analysis.knowledgeHubQuery);
            result = khResponse;
            if (khResponse.error) {
                return `I tried to find information in our Knowledge Hub, but encountered an issue: ${khResponse.error}. Please try rephrasing your question or contact support if the problem persists.`;
            }
        } else if (analysis.shouldCallTool && analysis.toolName) {
            result = await this.mcpManager.callTool(analysis.toolName, analysis.parameters || {});
        } else {
            return analysis.response || 'I understand your request but don\'t need to call any external services.';
        }
        return await this.bedrock.formatResponse(result, userQuery);
    }

    private async analyzeSimpleQuery(userQuery: string): Promise<{
        shouldCallTool: boolean;
        shouldCallKnowledgeHub: boolean;
        toolName?: string;
        parameters?: Record<string, any>;
        knowledgeHubQuery?: string;
        response?: string;
    }> {
        const availableTools = this.mcpManager.getAllTools();
        const toolsList = availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
        const prompt = `Analyze this query and decide what to do:

User Query: "${userQuery}"

Available Tools:
${toolsList}

Respond with JSON:
{
  "shouldCallTool": true/false,
  "shouldCallKnowledgeHub": true/false,
  "toolName": "tool_name_or_null",
  "parameters": {"param": "value"},
  "knowledgeHubQuery": "query_or_null",
  "response": "direct_response_or_null"
}

Knowledge Hub for: API specs, organizational knowledge, policies, documentation
MCP Tools for: Jira tickets, Confluence pages, database queries, Bitbucket operations`;
        try {
            const response = await this.bedrock.invokeModel(prompt, {
                temperature: 0.1,
                max_tokens: 500,
                top_p: 0.8
            });
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? jsonMatch[0] : response;
            return JSON.parse(jsonText);
        } catch (error) {
            return {
                shouldCallTool: false,
                shouldCallKnowledgeHub: false,
                response: 'I understand your request but encountered an error processing it.'
            };
        }
    }

    setUseSmartAgent(useSmartAgent: boolean): void {
        this.useSmartAgent = useSmartAgent;
    }

    updateSmartAgentConfig(config: Partial<SmartDispatcherConfig>): void {
        if (config.maxSteps !== undefined) {
            this.smartAgent.updateLoopPreventionSettings({ maxSteps: config.maxSteps });
        }
        if (config.maxConsecutiveFailures !== undefined) {
            this.smartAgent.updateLoopPreventionSettings({ maxConsecutiveFailures: config.maxConsecutiveFailures });
        }
        if (config.minConfidenceForContinue !== undefined) {
            this.smartAgent.updateLoopPreventionSettings({ minConfidenceForContinue: config.minConfidenceForContinue });
        }
    }

    async testConnections(): Promise<{ mcp: boolean; knowledgeHub: boolean }> {
        const results = {
            mcp: false,
            knowledgeHub: false
        };
        try {
            const connectedServers = this.mcpManager.getConnectedServers();
            results.mcp = connectedServers.length > 0;
        } catch (error) { }
        try {
            results.knowledgeHub = await this.knowledgeHub.testConnection();
        } catch (error) { }
        return results;
    }
}
