import { MultiServerMCPManager } from '../client/multi-server-mcp-manager.js';
import { KnowledgeHubClient } from '../ai/knowledge-hub-client.js';
import { BedrockClient, ToolInfo } from '../ai/bedrock-client.js';

export interface EnhancedAIAnalysis {
    shouldCallTool: boolean;
    shouldCallKnowledgeHub: boolean;
    toolName?: string;
    parameters?: Record<string, any>;
    knowledgeHubQuery?: string;
    response?: string;
    reasoning: string;
}

export class EnhancedToolDispatcher {
    constructor(
        private mcpManager: MultiServerMCPManager,
        private knowledgeHub: KnowledgeHubClient,
        private bedrock: BedrockClient
    ) { }

    /**
     * Process a user query through AI analysis and route to appropriate service
     */
    async processQuery(userQuery: string): Promise<string> {
        try {
            // Step 1: AI Analysis to determine routing
            const analysis = await this.analyzeQuery(userQuery);

            let result: any;

            if (analysis.shouldCallKnowledgeHub && analysis.knowledgeHubQuery) {
                // Step 2a: Query Knowledge Hub
                const khResponse = await this.knowledgeHub.query(analysis.knowledgeHubQuery);
                result = khResponse;

                // If Knowledge Hub returned an error, try to provide a helpful response
                if (khResponse.error) {
                    return `I tried to find information in our Knowledge Hub, but encountered an issue: ${khResponse.error}. Please try rephrasing your question or contact support if the problem persists.`;
                }
            } else if (analysis.shouldCallTool && analysis.toolName) {
                // Step 2b: Call MCP Tool
                result = await this.mcpManager.callTool(analysis.toolName, analysis.parameters || {});
            } else {
                // Step 2c: Use direct AI response
                return analysis.response || 'I understand your request but don\'t need to call any external services.';
            }

            // Step 3: Format the response
            return await this.bedrock.formatResponse(result, userQuery);

        } catch (error) {
            console.error('Error in EnhancedToolDispatcher:', error);
            return `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support if the problem persists.`;
        }
    }

    /**
     * Enhanced AI analysis that includes Knowledge Hub detection
     */
    private async analyzeQuery(userQuery: string): Promise<EnhancedAIAnalysis> {
        const availableTools = this.mcpManager.getAllTools();
        const prompt = this.createEnhancedAnalysisPrompt(userQuery, availableTools);

        try {
            const response = await this.bedrock.invokeModel(prompt, {
                temperature: 0.1,
                max_tokens: 1000,
                top_p: 0.8,
                top_k: 10
            });

            return this.parseEnhancedAnalysisResponse(response);
        } catch (error) {
            console.error('Error in enhanced AI analysis:', error);
            throw new Error(`Failed to analyze query: ${error}`);
        }
    }

    /**
     * Create enhanced analysis prompt that includes Knowledge Hub detection
     */
    private createEnhancedAnalysisPrompt(userQuery: string, availableTools: ToolInfo[]): string {
        const toolsList = availableTools.map(tool =>
            `- ${tool.name}: ${tool.description}`
        ).join('\n');

        return `You are an AI assistant that helps users interact with Jira, Confluence, MSSQL database, and Knowledge Hub.

User Query: "${userQuery}"

Available MCP Tools:
${toolsList}

Your job is to:
1. Understand what the user wants
2. Determine if a tool should be called OR if Knowledge Hub should be queried
3. If MCP tool: specify exact tool name and parameters
4. If Knowledge Hub: set shouldCallKnowledgeHub: true and provide a clear query
5. If neither: provide direct response

Knowledge Hub should be used for:
- API specifications and documentation
- Organization knowledge and processes
- Beneficiary information
- Merchant information (like Amadeus)
- General organizational data queries
- Company policies and procedures
- Technical documentation
- Best practices and guidelines

MCP Tools should be used for:
- Jira ticket operations (search, create, update)
- Confluence page operations
- Database queries and operations
- Bitbucket operations

Important Notes:
- Most Atlassian tools require a "cloudId" parameter (this will be added automatically by the client)
- For Jira search tools, use "jql" parameter with JQL query strings
- For specific ticket lookups, use "issueIdOrKey" parameter
- For project lookups, use "projectIdOrKey" parameter
- For database queries, use "query" parameter with SQL

Respond with JSON only:
{
  "shouldCallTool": true/false,
  "shouldCallKnowledgeHub": true/false,
  "toolName": "exact_tool_name_from_list_or_null",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "knowledgeHubQuery": "clear_query_for_knowledge_hub",
  "response": "direct_response_if_no_tool_or_kh_needed",
  "reasoning": "brief explanation of your decision"
}

Examples:
- "Show me all open tickets" → shouldCallTool: true, toolName: "searchJiraIssuesUsingJql", parameters: {"jql": "status != Done"}
- "Get ticket MD-1" → shouldCallTool: true, toolName: "getJiraIssue", parameters: {"issueIdOrKey": "MD-1"}
- "What are our API specifications?" → shouldCallKnowledgeHub: true, knowledgeHubQuery: "What are the API specifications for our organization?"
- "Tell me about Amadeus integration" → shouldCallKnowledgeHub: true, knowledgeHubQuery: "What is the Amadeus integration and how does it work?"
- "Query users table" → shouldCallTool: true, toolName: "execute_query", parameters: {"query": "SELECT * FROM users"}
- "Hello" → shouldCallTool: false, shouldCallKnowledgeHub: false, response: "Hello! How can I help you with Jira, Confluence, database, or Knowledge Hub today?"

Important: Use exact tool names from the list above. Don't include cloudId in parameters - it will be added automatically.`;
    }

    /**
     * Parse the enhanced AI analysis response
     */
    private parseEnhancedAnalysisResponse(responseText: string): EnhancedAIAnalysis {
        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? jsonMatch[0] : responseText;

            const parsed = JSON.parse(jsonText);

            return {
                shouldCallTool: parsed.shouldCallTool || false,
                shouldCallKnowledgeHub: parsed.shouldCallKnowledgeHub || false,
                toolName: parsed.toolName,
                parameters: parsed.parameters || {},
                knowledgeHubQuery: parsed.knowledgeHubQuery,
                response: parsed.response,
                reasoning: parsed.reasoning || 'No reasoning provided'
            };
        } catch (error) {
            console.error('Error parsing enhanced AI response:', error);
            throw new Error('Failed to parse AI response into valid structure');
        }
    }

    /**
     * Test all connections
     */
    async testConnections(): Promise<{ mcp: boolean; knowledgeHub: boolean }> {
        const results = {
            mcp: false,
            knowledgeHub: false
        };

        try {
            // Test MCP connections
            const connectedServers = this.mcpManager.getConnectedServers();
            results.mcp = connectedServers.length > 0;
        } catch (error) {
            console.error('MCP connection test failed:', error);
        }

        try {
            // Test Knowledge Hub connection
            results.knowledgeHub = await this.knowledgeHub.testConnection();
        } catch (error) {
            console.error('Knowledge Hub connection test failed:', error);
        }

        return results;
    }
} 