import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface ToolInfo {
    name: string;
    description: string;
}

export interface AIAnalysis {
    shouldCallTool: boolean;
    toolName?: string;
    parameters?: Record<string, any>;
    response?: string;
    reasoning: string;
}

export interface BedrockConfig {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
}

export class BedrockClient {
    private client: BedrockRuntimeClient;
    private modelId: string;
    private config: BedrockConfig;

    constructor(config: BedrockConfig, modelId: string = 'apac.anthropic.claude-sonnet-4-20250514-v1:0') {
        this.config = config;
        this.modelId = modelId;

        this.client = new BedrockRuntimeClient({
            region: config.region,
            credentials: config.accessKeyId && config.secretAccessKey ? {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                sessionToken: config.sessionToken
            } : undefined
        });
    }

    /**
     * Analyze user query and determine if a tool should be called
     */
    async analyzeQuery(userQuery: string, availableTools: ToolInfo[]): Promise<AIAnalysis> {
        const prompt = this.createAnalysisPrompt(userQuery, availableTools);

        try {
            const response = await this.invokeModel(prompt, {
                temperature: 0.1,
                max_tokens: 1000,
                top_p: 0.8,
                top_k: 10
            });

            return this.parseAnalysisResponse(response);
        } catch (error) {
            console.error('Error analyzing query with Bedrock:', error);
            throw new Error(`Failed to analyze query: ${error}`);
        }
    }

    /**
     * Format MCP tool response for user
     */
    async formatResponse(data: any, originalQuery: string): Promise<string> {
        const prompt = this.createFormattingPrompt(data, originalQuery);

        try {
            const response = await this.invokeModel(prompt, {
                temperature: 0.3,
                max_tokens: 1500,
                top_p: 0.9
            });

            return response;
        } catch (error) {
            console.error('Error formatting response with Bedrock:', error);
            return `Here's the data: ${JSON.stringify(data, null, 2)}`;
        }
    }

    /**
     * Invoke the Bedrock model
     */
    private async invokeModel(prompt: string, config: any = {}): Promise<string> {
        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: config.max_tokens || 1000,
            temperature: config.temperature || 0.1,
            top_p: config.top_p || 0.8,
            top_k: config.top_k || 10,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: this.modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body)
        });

        try {
            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));

            if (responseBody.content && responseBody.content.length > 0) {
                return responseBody.content[0].text;
            } else {
                throw new Error('Empty response from Bedrock');
            }
        } catch (error) {
            console.error('Bedrock API error:', error);
            throw error;
        }
    }

    private createAnalysisPrompt(userQuery: string, availableTools: ToolInfo[]): string {
        const toolsList = availableTools.map(tool =>
            `- ${tool.name}: ${tool.description}`
        ).join('\n');

        return `You are an AI assistant that helps users interact with Jira and Confluence through MCP tools.

User Query: "${userQuery}"

Available MCP Tools:
${toolsList}

Your job is to:
1. Understand what the user wants
2. Determine if a tool should be called
3. If yes, specify the exact tool name and parameters
4. If no, provide a direct response

Important Notes:
- Most Atlassian tools require a "cloudId" parameter (this will be added automatically by the client)
- For Jira search tools, use "jql" parameter with JQL query strings
- For specific ticket lookups, use "issueIdOrKey" parameter
- For project lookups, use "projectIdOrKey" parameter

Respond with JSON only:
{
  "shouldCallTool": true/false,
  "toolName": "exact_tool_name_from_list_or_null",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "response": "direct_response_if_no_tool_needed",
  "reasoning": "brief explanation of your decision"
}

Examples:
- "Show me all open tickets" → shouldCallTool: true, toolName: "searchJiraIssuesUsingJql", parameters: {"jql": "status != Done"}
- "Get ticket MD-1" → shouldCallTool: true, toolName: "getJiraIssue", parameters: {"issueIdOrKey": "MD-1"}
- "List all projects" → shouldCallTool: true, toolName: "getVisibleJiraProjects", parameters: {}
- "Find high priority bugs" → shouldCallTool: true, toolName: "searchJiraIssuesUsingJql", parameters: {"jql": "priority = High AND type = Bug"}
- "Search for login issues" → shouldCallTool: true, toolName: "searchJiraIssuesUsingJql", parameters: {"jql": "summary ~ 'login'"}
- "Hello" → shouldCallTool: false, response: "Hello! How can I help you with Jira or Confluence today?"
- "What can you do?" → shouldCallTool: false, response: "I can help you search tickets, get project info, manage Confluence pages, and more. Just ask!"

Important: Use exact tool names from the list above. Don't include cloudId in parameters - it will be added automatically.`;
    }

    private createFormattingPrompt(data: any, originalQuery: string): string {
        return `You are an AI assistant that formats MCP tool responses for users.

Original Query: "${originalQuery}"
Tool Response Data: ${JSON.stringify(data, null, 2)}

Convert this data into a helpful, conversational response for the user. Use emojis and formatting to make it readable.

Examples:
- For ticket lists: "Found 3 tickets: 📋 MD-1 (High Priority), 📋 MD-2 (Medium)..."
- For single ticket: "📋 MD-1: 'Ticket Title' | Status: To Do | Priority: High"
- For projects: "Found 2 projects: 🏗️ Project A (10 tickets), 🏗️ Project B (5 tickets)"
- For errors: "❌ Sorry, I couldn't find that information. Please try a different query."

Be conversational and helpful. If there are no results, explain that clearly.`;
    }

    private parseAnalysisResponse(responseText: string): AIAnalysis {
        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? jsonMatch[0] : responseText;

            const parsed = JSON.parse(jsonText);

            return {
                shouldCallTool: parsed.shouldCallTool || false,
                toolName: parsed.toolName,
                parameters: parsed.parameters || {},
                response: parsed.response,
                reasoning: parsed.reasoning || 'No reasoning provided'
            };
        } catch (error) {
            console.error('Error parsing AI response:', error);
            throw new Error('Failed to parse AI response into valid structure');
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await this.invokeModel('Say "Hello from AWS Bedrock Claude Sonnet 4!"');

            console.log('✅ AWS Bedrock connection successful:', response);
            return true;
        } catch (error) {
            console.error('❌ AWS Bedrock connection failed:', error);
            return false;
        }
    }
} 