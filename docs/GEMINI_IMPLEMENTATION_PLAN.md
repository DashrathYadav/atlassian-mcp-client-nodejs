# Gemini AI Implementation Plan for Atlassian MCP Interface

## 🚀 **Phase 1: MVP with Gemini AI (This Week)**

### Key Advantage: Gemini's Built-in MCP Support

Gemini AI has **experimental MCP integration** which means we can potentially connect our Atlassian MCP client directly to Gemini for automatic tool calling!

## 📦 **Dependencies & Setup**

### Install Gemini SDK:

```bash
npm install @google/genai
npm install commander chalk inquirer ora
npm install zod  # for validation
```

### Environment Setup:

```env
GEMINI_API_KEY=your-gemini-api-key-from-aistudio
ATLASSIAN_CLOUD_ID=65fa3ca6-c0c5-4d04-93d2-88127a2297ff
```

## 🛠️ **Implementation Strategy**

### Option 1: Direct MCP Integration (Experimental)

Use Gemini's built-in MCP support to connect directly to our Atlassian MCP client.

### Option 2: Traditional Function Calling (Reliable)

Use Gemini's function calling to map intents to our MCP tools.

**We'll start with Option 2 for reliability, then explore Option 1.**

## 📋 **Day-by-Day Implementation**

### Day 1: Gemini Integration & Query Parser

1. Set up Gemini AI client
2. Create intent classification system
3. Test basic natural language understanding

### Day 2: Tool Router & Parameter Mapping

1. Map intents to MCP tools using function declarations
2. Create parameter transformation logic
3. Implement validation

### Day 3: Response Formatter

1. Use Gemini to format MCP responses
2. Create human-readable output templates
3. Add error handling

### Day 4: Interactive CLI

1. Build terminal interface with conversation loop
2. Integrate all components
3. Add help system and commands

### Day 5: Testing & Refinement

1. Test various query types
2. Improve prompts and error handling
3. Add conversation context

## 🎯 **Core Components Implementation**

### 1. Gemini Client (`src/ai/gemini-client.ts`)

```typescript
import { GoogleGenAI } from "@google/genai";

export class GeminiClient {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async parseQuery(userQuery: string): Promise<QueryIntent> {
    // Use Gemini to parse natural language to structured intent
  }

  async formatResponse(data: any, queryType: string): Promise<string> {
    // Use Gemini to create human-readable responses
  }
}
```

### 2. Intent Schemas

```typescript
interface QueryIntent {
  action: "search" | "get" | "list" | "create" | "update";
  entity: "tickets" | "projects" | "users" | "pages";
  filters: QueryFilter[];
  parameters: Record<string, any>;
  confidence: number;
}
```

### 3. Function Declarations for Gemini

```typescript
const mcpToolDeclarations = [
  {
    name: "searchJiraIssues",
    description: "Search for Jira tickets using JQL query",
    parametersJsonSchema: {
      type: "object",
      properties: {
        jql: { type: "string", description: "JQL query string" },
        cloudId: { type: "string", description: "Atlassian cloud ID" },
      },
      required: ["jql", "cloudId"],
    },
  },
  // ... more tool declarations
];
```

## 🎭 **Supported Query Examples**

### Simple Queries:

- "Show me all open tickets" → `searchJiraIssuesUsingJql(jql: "status != Done")`
- "Get ticket MD-1" → `getJiraIssue(issueIdOrKey: "MD-1")`
- "List all projects" → `getJiraProjects()`

### Complex Queries:

- "Find high priority bugs assigned to John" → `searchJiraIssuesUsingJql(jql: "priority = High AND type = Bug AND assignee = john")`
- "Show tickets created this week" → `searchJiraIssuesUsingJql(jql: "created >= -1w")`

## 💬 **Conversation Flow Design**

```
🤖 Atlassian AI: Hello! I can help you with Jira and Confluence. What would you like to do?

👤 User: show me all open tickets

🤖 AI: [Processing...] Let me search for all open tickets...
     [Calling: searchJiraIssuesUsingJql(jql: "status != Done", cloudId: "...")]

     Found 1 open ticket:
     📋 MD-1: "Do the Research on Jira mcp server"
        📊 Status: To Do
        🚀 Priority: Highest
        👤 Assignee: Unassigned
        📅 Created: 2 days ago

👤 User: what are the details of MD-1?

🤖 AI: [Processing...] Getting detailed information for MD-1...
     [Calling: getJiraIssue(issueIdOrKey: "MD-1", cloudId: "...")]

     📋 **Ticket MD-1 Details:**
     **Summary:** Do the Research on Jira mcp server
     **Status:** To Do
     **Priority:** Highest
     **Type:** Submit a request or incident
     **Assignee:** Unassigned
     **Reporter:** Dashrath Yadav
     **Created:** January 28, 2025
     **Updated:** January 30, 2025
     **Description:** [Full description here...]

👤 User: exit

🤖 AI: Goodbye! Have a productive day! 👋
```

## 🔧 **Gemini Configuration**

### Model Selection:

- **Primary**: `gemini-2.0-flash-001` (latest, fastest)
- **Fallback**: `gemini-1.5-pro` (more reliable)

### Generation Config:

```typescript
const generationConfig = {
  temperature: 0.1, // Low for consistent parsing
  maxOutputTokens: 1000, // Sufficient for responses
  topP: 0.8,
  topK: 10,
};
```

## 🧪 **Testing Strategy**

### Unit Tests:

1. Query parsing accuracy (95%+ correct intent detection)
2. Parameter extraction validation
3. Response formatting quality

### Integration Tests:

1. End-to-end query processing
2. MCP tool calling with real data
3. Error handling scenarios

### User Acceptance Tests:

1. Natural conversation flow
2. Response time (< 3 seconds)
3. Human-readable output quality

## 🚀 **Implementation Steps**

### Step 1: Basic Setup

```bash
# Create package.json updates
npm install @google/genai commander chalk inquirer ora zod

# Set up environment
echo "GEMINI_API_KEY=your-api-key" >> .env
```

### Step 2: Create Core Structure

```
src/ai/
├── gemini-client.ts      # Main Gemini integration
├── query-parser.ts       # Parse user queries
├── response-formatter.ts # Format responses
└── prompt-templates.ts   # Gemini prompts

src/cli/
├── ai-cli.ts            # Interactive terminal
└── command-processor.ts # Process commands
```

### Step 3: Build & Test

```bash
npx tsx src/cli/ai-cli.ts
```

## 📈 **Success Metrics**

1. ✅ **Accuracy**: 90%+ correct intent detection
2. ✅ **Speed**: < 3 seconds average response
3. ✅ **Coverage**: Support 10+ query types
4. ✅ **UX**: Smooth conversational experience
5. ✅ **Reliability**: Graceful error handling

This plan leverages Gemini's strengths while building on our existing MCP infrastructure for a powerful AI-driven Atlassian interface.
