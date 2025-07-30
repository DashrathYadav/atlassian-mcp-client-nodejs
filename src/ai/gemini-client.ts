import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Define the intent schema
export const QueryIntentSchema = z.object({
  action: z.enum(['search', 'get', 'list', 'greeting', 'conversation']),
  entity: z.enum(['tickets', 'projects', 'spaces', 'conversation', 'tools'])
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

interface AIResponse {
  intent: QueryIntent;
  suggestedTool: string;
  toolParameters: Record<string, any>;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash-001') {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async parseQuery(userQuery: string, availableTools?: Array<{name: string, description: string}>): Promise<AIResponse> {
    const prompt = this.createQueryParsingPrompt(userQuery, availableTools);
    
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 10
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }
      
      const result = this.parseAIResponse(responseText);
      return result;
    } catch (error) {
      console.error('Error parsing query with Gemini:', error);
      throw new Error(`Failed to parse query: ${error}`);
    }
  }

  async formatResponse(data: any, queryType: string, originalQuery: string): Promise<string> {
    const prompt = this.createResponseFormattingPrompt(data, queryType, originalQuery);
    
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 1500,
          topP: 0.9
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }
      
      return responseText;
    } catch (error) {
      console.error('Error formatting response with Gemini:', error);
      return `Here's the raw data: ${JSON.stringify(data, null, 2)}`;
    }
  }

  private createQueryParsingPrompt(userQuery: string, availableTools?: Array<{name: string, description: string}>): string {
    // Use dynamic tools if provided, otherwise fallback to hardcoded list
    const toolsList = availableTools ? 
      availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n') :
      `- searchJiraIssuesUsingJql: Search Jira tickets
- getJiraIssue: Get specific ticket details  
- getJiraProjects: List projects
- getConfluenceSpaces: List Confluence spaces
- searchConfluenceContent: Search Confluence content`;

    return `You are an AI assistant that helps users retrieve data from Jira and Confluence using MCP tools.

User query: "${userQuery}"

Available MCP tools:
${toolsList}

Determine the user's intent and respond with JSON:
{
  "intent": {
    "action": "search|get|list|greeting|conversation",
    "entity": "tickets|projects|spaces|conversation|tools"
  },
  "suggestedTool": "tool_name_or_none",
  "toolParameters": {
    "key": "value"
  }
}

Parameter extraction examples:
- "Get ticket MD-1" → action: "get", toolParameters: {"issueIdOrKey": "MD-1"}
- "Show me jira tickets" → action: "search", toolParameters: {"jql": ""}
- "List all tickets" → action: "search", toolParameters: {"jql": ""}
- "Show me high priority bugs" → action: "search", toolParameters: {"jql": "priority = High AND type = Bug"}
- "Search for login issues" → action: "search", toolParameters: {"jql": "summary ~ 'login'"}
- "List all projects" → action: "list", toolParameters: {}

Important: Use "get" only when user specifies a specific ticket ID/key. Use "search" for listing or finding multiple tickets.

For greetings, conversations, or questions about available tools, use suggestedTool: "none".`;
  }

  private createResponseFormattingPrompt(data: any, _queryType: string, originalQuery: string): string {
    return `You are an AI assistant that helps users retrieve data from Jira and Confluence using MCP tools.

User asked: "${originalQuery}"
Data received: ${JSON.stringify(data, null, 2)}

Convert this data into a helpful, conversational response for the user.`;
  }

  private parseAIResponse(responseText: string): AIResponse {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      
      const parsed = JSON.parse(jsonText);
      
      // Validate the intent structure
      const validatedIntent = QueryIntentSchema.parse(parsed.intent);
      
      return {
        intent: validatedIntent,
        suggestedTool: parsed.suggestedTool || 'unknown',
        toolParameters: parsed.toolParameters || {}
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response into valid structure');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: 'Say "Hello from Gemini AI!"'
      });
      
      console.log('✅ Gemini AI connection successful:', response.text);
      return true;
    } catch (error) {
      console.error('❌ Gemini AI connection failed:', error);
      return false;
    }
  }
}
