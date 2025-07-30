import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Define the intent schema
export const QueryIntentSchema = z.object({
  action: z.enum(['search', 'get', 'list', 'create', 'update', 'transition']),
  entity: z.enum(['tickets', 'issues', 'projects', 'users', 'pages', 'comments']),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'in', 'greater_than', 'less_than']),
    value: z.union([z.string(), z.number(), z.array(z.string())])
  })).optional(),
  parameters: z.record(z.unknown()),
  confidence: z.number().min(0).max(1)
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

interface AIResponse {
  intent: QueryIntent;
  reasoning: string;
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

  async parseQuery(userQuery: string): Promise<AIResponse> {
    const prompt = this.createQueryParsingPrompt(userQuery);
    
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

  private createQueryParsingPrompt(userQuery: string): string {
    return `You are an AI assistant that parses natural language queries about Jira and Confluence and converts them to structured intents.

Given this user query: "${userQuery}"

First, determine if this is:
1. A greeting/conversational query (like "hi", "hello", "how are you")
2. An Atlassian-related query (about tickets, projects, etc.)

If it's a greeting/conversational query, respond with:
{
  "intent": {
    "action": "search",
    "entity": "tickets", 
    "filters": [],
    "parameters": {},
    "confidence": 0.1
  },
  "reasoning": "This is a conversational greeting, defaulting to show recent tickets",
  "suggestedTool": "searchJiraIssuesUsingJql",
  "toolParameters": {
    "cloudId": "65fa3ca6-c0c5-4d04-93d2-88127a2297ff",
    "jql": "status != Done ORDER BY updated DESC"
  }
}

If it's an Atlassian-related query, analyze it and return a JSON response with this exact structure:
{
  "intent": {
    "action": "search|get|list|create|update|transition",
    "entity": "tickets|issues|projects|users|pages|comments",
    "filters": [
      {
        "field": "field_name",
        "operator": "equals|contains|in|greater_than|less_than",
        "value": "field_value"
      }
    ],
    "parameters": {
      "key": "value"
    },
    "confidence": 0.95
  },
  "reasoning": "Brief explanation of why you chose this intent",
  "suggestedTool": "exact_mcp_tool_name",
  "toolParameters": {
    "parameter_name": "parameter_value"
  }
}

Available MCP Tools:
- searchJiraIssuesUsingJql: Search tickets with JQL query
- getJiraIssue: Get specific ticket by ID/key
- getJiraProjects: List all projects
- getJiraProject: Get specific project details
- getJiraIssueTransitions: Get available transitions for a ticket
- createJiraIssue: Create a new ticket
- updateJiraIssue: Update an existing ticket

Query Examples:
- "show me all open tickets" → action: "search", entity: "tickets", suggestedTool: "searchJiraIssuesUsingJql"
- "get ticket MD-1" → action: "get", entity: "tickets", suggestedTool: "getJiraIssue"
- "list all projects" → action: "list", entity: "projects", suggestedTool: "getJiraProjects"

Important: Always include cloudId: "65fa3ca6-c0c5-4d04-93d2-88127a2297ff" in toolParameters.

Return only valid JSON, no additional text.`;
  }

  private createResponseFormattingPrompt(data: any, queryType: string, originalQuery: string): string {
    return `You are an AI assistant that converts raw Jira/Confluence API data into human-readable responses.

Original Query: "${originalQuery}"
Query Type: "${queryType}"
Raw Data: ${JSON.stringify(data, null, 2)}

Instructions:
1. If the original query was a greeting (like "hi", "hello", "how are you"), start with a friendly greeting
2. Then convert the data into a natural, conversational response that:
   - Directly answers the user's question
   - Uses emojis and formatting for better readability
   - Highlights important information (status, priority, assignee, etc.)
   - Keeps the response concise but informative
   - Uses bullet points or numbered lists when appropriate

Examples:
- For greetings + ticket data: "Hi there! 👋 I'm doing great and ready to help with your Atlassian data! Here's what I found: • MD-1 (High Priority) • MD-2 (Medium)..."
- For ticket searches: "Found 3 tickets: • MD-1 (High Priority) • MD-2 (Medium)..."
- For single ticket: "📋 MD-1: 'Ticket Title' | Status: To Do | Priority: High | Assignee: John Doe"
- For projects: "Found 2 projects: • Project A (10 tickets) • Project B (5 tickets)"

Be conversational and helpful. If there are no results, explain that clearly with suggestions.`;
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
        reasoning: parsed.reasoning || 'No reasoning provided',
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
