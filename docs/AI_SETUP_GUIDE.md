# 🚀 AI-Powered Atlassian Interface Setup Guide

## ✅ **Prerequisites**

1. **Working Atlassian MCP Client** (Already set up ✅)
2. **Gemini API Key** (Required)
3. **Node.js 18+** (Already installed ✅)

## 🔑 **Step 1: Get Gemini API Key**

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy your API key

## 🛠️ **Step 2: Configure Environment**

1. Copy the environment example:

```bash
cp .env.example .env
```

2. Add your Gemini API key to `.env`:

```env
GEMINI_API_KEY=your-gemini-api-key-here
ATLASSIAN_CLOUD_ID=65fa3ca6-c0c5-4d04-93d2-88127a2297ff
```

## 🧪 **Step 3: Test Gemini Integration**

Run the Gemini test to verify everything works:

```bash
npm run test:gemini
```

Expected output:

```
🧪 Testing Gemini AI Integration
================================

1. Testing Gemini AI connection...
✅ Gemini AI connection successful: Hello from Gemini AI!

2. Testing query parsing...
Query: "show me all open tickets"
✅ Parsed successfully:
  Action: search
  Entity: tickets
  Tool: searchJiraIssuesUsingJql
  Confidence: 0.95
  → Routed to: searchJiraIssuesUsingJql
  → Parameters: { "cloudId": "...", "jql": "status != Done" }

...
```

## 🚀 **Step 4: Start AI Interface**

Start the AI-powered chat interface:

```bash
npm run ai
```

Expected flow:

```
🤖 AI-Powered Atlassian Assistant
Connecting to services...
✅ Gemini AI connected
✅ Atlassian MCP connected

✅ All systems ready! You can now ask questions about Jira and Confluence.

Examples:
  • "Show me all open tickets"
  • "Get details for ticket MD-1"
  • "List all projects"
  • Type "help" for more commands

🤖 You: show me all open tickets
```

## 💬 **Example Interactions**

### 1. Search Tickets

```
🤖 You: show me all open tickets
🤖 AI: Found 1 open ticket:
   📋 MD-1: "Do the Research on Jira mcp server"
      📊 Status: To Do | 🚀 Priority: Highest | 👤 Assignee: Unassigned
```

### 2. Get Ticket Details

```
🤖 You: what are the details of MD-1?
🤖 AI: 📋 **Ticket MD-1 Details:**
   **Summary:** Do the Research on Jira mcp server
   **Status:** To Do
   **Priority:** Highest
   **Type:** Submit a request or incident
   ...
```

### 3. List Projects

```
🤖 You: list all projects
🤖 AI: Found 2 projects:
   • Project A (KEY: PROJ-A) - 10 open tickets
   • Project B (KEY: PROJ-B) - 5 open tickets
```

## 🎛️ **Available Commands**

### Natural Language Queries:

- `"Show me all open tickets"`
- `"Get details for ticket MD-1"`
- `"List all projects"`
- `"Find high priority bugs"`
- `"Search for tickets about login"`
- `"What tickets were created this week?"`

### Special Commands:

- `help` - Show help and examples
- `history` - Show conversation history
- `clear` - Clear screen
- `tools` - Show available MCP tools
- `exit` - Exit the application

## 🔧 **Architecture Overview**

```
User Query → Gemini AI Parser → Tool Router → MCP Client → Response Formatter → User
     ↑                                                                            ↓
     └─────────────────── Conversation Loop ───────────────────────────────────┘
```

## 🛠️ **Core Components**

1. **GeminiClient** (`src/ai/gemini-client.ts`)

   - Parses natural language queries
   - Formats responses for humans

2. **MCPToolRouter** (`src/routing/tool-router.ts`)

   - Maps AI intents to MCP tools
   - Transforms parameters

3. **MCPToolDispatcher** (`src/routing/tool-dispatcher.ts`)

   - Executes MCP tool calls
   - Handles parameter mapping

4. **AIAtlassianCLI** (`src/cli/ai-cli.ts`)
   - Interactive terminal interface
   - Conversation management

## 📊 **Supported Query Types**

### ✅ Currently Supported:

- Search tickets by status, priority, assignee
- Get specific ticket details
- List projects and project details
- Get ticket transitions
- Basic ticket creation and updates

### 🔄 Coming Soon:

- Advanced JQL query building
- Bulk operations
- Confluence content management
- Multi-step workflows
- Query suggestions and autocomplete

## 🐛 **Troubleshooting**

### Issue: "GEMINI_API_KEY not found"

- **Solution**: Make sure you've added your API key to the `.env` file

### Issue: "Failed to connect to Gemini AI"

- **Solution**: Check your API key is valid and you have internet connection

### Issue: "No tool mapping found for intent"

- **Solution**: Try rephrasing your query or check the supported query types

### Issue: MCP connection fails

- **Solution**: This means the underlying Atlassian MCP client has issues. Check the existing connection guide.

## 🎯 **Performance Tips**

1. **Use specific queries** for faster results
2. **Check conversation history** to avoid repeating questions
3. **Use help command** to see examples
4. **Be conversational** - the AI understands natural language

## 🔄 **Next Steps**

1. **Test with real queries** to see how it performs
2. **Provide feedback** on query understanding accuracy
3. **Request new features** for additional functionality
4. **Explore advanced use cases** with multi-step queries

## 📞 **Support**

If you encounter issues:

1. Check this guide first
2. Run `npm run test:gemini` to verify setup
3. Check the conversation history for context
4. Try rephrasing your query

**Ready to start? Run `npm run ai` and start chatting with your Atlassian data!** 🚀
