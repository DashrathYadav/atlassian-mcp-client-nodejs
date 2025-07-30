# Complete Guide: Connecting to Atlassian MCP Server with Custom Client

This document provides a comprehensive guide on how to successfully connect to the Atlassian Remote MCP Server using a custom TypeScript client.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Understanding the Architecture](#understanding-the-architecture)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Key Learnings](#key-learnings)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Testing & Validation](#testing--validation)
8. [Available Tools](#available-tools)
9. [Best Practices](#best-practices)

## Overview

The Atlassian Remote MCP Server is a cloud-based bridge that enables external tools to interact with Jira and Confluence data in real-time. It uses OAuth 2.1 authentication and the Model Context Protocol (MCP) for secure communication.

### What We Achieved

- ✅ Successfully connected to Atlassian MCP server
- ✅ Implemented OAuth 2.1 PKCE authentication
- ✅ Listed all 25 available Atlassian tools
- ✅ Created a working TypeScript client
- ✅ Handled transport fallbacks and error scenarios

## Prerequisites

### System Requirements

- **Node.js v18+** (Required for mcp-remote tool)
- **Modern browser** for OAuth authentication
- **Atlassian Cloud site** with Jira and/or Confluence access
- **Internet connectivity** to reach `https://mcp.atlassian.com`

### Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "tsx": "^4.6.0",
  "typescript": "^5.3.0"
}
```

## Understanding the Architecture

### Connection Flow

```
Custom Client ↔ mcp-remote Proxy ↔ Atlassian MCP Server ↔ Atlassian Cloud
```

1. **mcp-remote proxy**: Official Atlassian tool that handles OAuth and transport
2. **Local MCP server**: Runs on your machine, provides MCP interface
3. **Custom client**: Your TypeScript application using MCP SDK
4. **Atlassian MCP server**: Cloud service at `https://mcp.atlassian.com/v1/sse`

### Key Components

- **Authentication**: OAuth 2.1 with PKCE (no client secrets needed)
- **Transport**: Server-Sent Events (SSE) with HTTP fallback
- **Protocol**: Model Context Protocol (MCP) over STDIO

## Step-by-Step Implementation

### Step 1: Install the mcp-remote Tool

The `mcp-remote` tool is the official proxy provided by Atlassian:

```bash
# Install and run the proxy
npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

**Expected Output:**

```
[12345] Using automatically selected callback port: 5598
[12345] Connecting to remote server: https://mcp.atlassian.com/v1/sse
[12345] Using transport strategy: http-first
[12345] Received error: Error POSTing to endpoint (HTTP 404): Not Found
[12345] Recursively reconnecting for reason: falling-back-to-alternate-transport
[12345] Using transport strategy: sse-only
[12345] Connected to remote server using SSEClientTransport
[12345] Local STDIO server running
[12345] Proxy established successfully
```

### Step 2: Handle OAuth Authentication

When you run mcp-remote for the first time:

1. **Browser opens automatically** to Atlassian OAuth page
2. **Login with your Atlassian account**
3. **Grant permissions** for Jira and Confluence access
4. **Authentication completes** and browser shows success
5. **Proxy is ready** to accept MCP client connections

**Important**: Subsequent runs reuse the OAuth session (no re-authentication needed).

### Step 3: Create the Custom MCP Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class AtlassianMCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  constructor() {
    this.client = new Client(
      { name: "custom-atlassian-client", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  async connect(): Promise<void> {
    // Create transport that spawns mcp-remote
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"],
    });

    // Connect using the transport
    await this.client.connect(this.transport);
    this.isConnected = true;

    // List available tools
    const tools = await this.client.listTools();
    console.log(
      "Available tools:",
      tools.tools.map((t) => t.name)
    );
  }
}
```

### Step 4: Implement Tool Calls

Use the correct tool names from the Atlassian MCP server:

```typescript
// Get Jira projects (correct tool name)
async getJiraProjects(): Promise<any[]> {
  const response = await this.client.callTool({
    name: "getVisibleJiraProjects", // NOT "jira_get_projects"
    arguments: {}
  });

  if (response.content && Array.isArray(response.content) && response.content.length > 0) {
    const content = response.content[0];
    if (content.type === "text" && content.text) {
      return JSON.parse(content.text);
    }
  }
  return [];
}

// Search Jira issues (correct tool name)
async searchJiraIssues(jql: string): Promise<any[]> {
  const response = await this.client.callTool({
    name: "searchJiraIssuesUsingJql", // NOT "jira_search_issues"
    arguments: { jql, maxResults: 50 }
  });
  // Parse response...
}
```

## Key Learnings

### 1. Authentication Handling

- **OAuth 2.1 PKCE**: No client secrets required, browser-based flow
- **Session persistence**: OAuth tokens cached locally, reused across sessions
- **Automatic refresh**: mcp-remote handles token refresh automatically

### 2. Transport Strategy

- **HTTP-first approach**: Tries HTTP POST, falls back to SSE
- **404 errors are normal**: Expected when HTTP transport fails
- **SSE is the working transport**: Server-Sent Events for real-time communication

### 3. Tool Name Conventions

The Atlassian MCP server uses specific tool names (discovered during connection):

```javascript
// ✅ CORRECT tool names
"getVisibleJiraProjects"; // NOT "jira_get_projects"
"searchJiraIssuesUsingJql"; // NOT "jira_search_issues"
"createJiraIssue"; // NOT "jira_create_issue"
"getConfluenceSpaces"; // NOT "confluence_get_spaces"
"searchConfluenceUsingCql"; // NOT "confluence_search"
```

### 4. Response Format

All tool responses follow this structure:

```typescript
interface MCPResponse {
  content: Array<{
    type: "text";
    text: string; // JSON string containing actual data
  }>;
}
```

Always check for `Array.isArray(response.content)` and parse `content[0].text` as JSON.

## Common Issues & Solutions

### Issue 1: "command not found: tsx"

**Problem**: Running `tsx` directly in terminal fails
**Solution**: Use `npx tsx` or run through npm scripts

### Issue 2: "Tool not found" errors

**Problem**: Using incorrect tool names (e.g., `jira_get_projects`)
**Solution**: Use exact tool names from `listTools()` response

### Issue 3: Connection hangs or timeouts

**Problem**: mcp-remote process gets stuck
**Solution**:

- Kill existing mcp-remote processes
- Clear OAuth cache if needed
- Restart with fresh authentication

### Issue 4: "Property 'content' length does not exist"

**Problem**: TypeScript errors with MCP SDK response types
**Solution**: Always check `Array.isArray(response.content)` before accessing

### Issue 5: OAuth authentication loops

**Problem**: Browser keeps opening for authentication
**Solution**: Complete the full OAuth flow in browser, don't cancel

## Testing & Validation

### Verify Connection Success

Look for these indicators in the output:

```bash
✅ "Connected to remote server using SSEClientTransport"
✅ "Local STDIO server running"
✅ "Proxy established successfully"
✅ "Available tools: [25 tools listed]"
```

### Test Basic Operations

```typescript
// Test connection and list tools
const tools = await client.listTools();
console.log(`Found ${tools.tools.length} tools`);

// Test user info
const userInfo = await client.callTool({
  name: "atlassianUserInfo",
  arguments: {},
});

// Test Jira projects
const projects = await client.callTool({
  name: "getVisibleJiraProjects",
  arguments: {},
});
```

## Available Tools

The Atlassian MCP server provides 25 tools:

### User & Resource Tools

- `atlassianUserInfo`
- `getAccessibleAtlassianResources`

### Jira Tools

- `getVisibleJiraProjects`
- `getJiraIssue`
- `createJiraIssue`
- `editJiraIssue`
- `searchJiraIssuesUsingJql`
- `getTransitionsForJiraIssue`
- `transitionJiraIssue`
- `addCommentToJiraIssue`
- `getJiraIssueRemoteIssueLinks`
- `lookupJiraAccountId`
- `getJiraProjectIssueTypesMetadata`

### Confluence Tools

- `getConfluenceSpaces`
- `getConfluencePage`
- `getPagesInConfluenceSpace`
- `getConfluencePageAncestors`
- `getConfluencePageDescendants`
- `getConfluencePageFooterComments`
- `getConfluencePageInlineComments`
- `createConfluencePage`
- `updateConfluencePage`
- `createConfluenceFooterComment`
- `createConfluenceInlineComment`
- `searchConfluenceUsingCql`

## Best Practices

### 1. Error Handling

```typescript
try {
  const response = await client.callTool({
    name: "getVisibleJiraProjects",
    arguments: {},
  });

  if (
    response.content &&
    Array.isArray(response.content) &&
    response.content.length > 0
  ) {
    const content = response.content[0];
    if (content.type === "text" && content.text) {
      return JSON.parse(content.text);
    }
  }
  return [];
} catch (error) {
  console.error("Tool call failed:", error);
  throw error;
}
```

### 2. Connection Management

```typescript
class AtlassianMCPClient {
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("Already connected");
      return;
    }
    // ... connection logic
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.close();
    }
    this.isConnected = false;
  }
}
```

### 3. Graceful Process Handling

```typescript
// Handle Ctrl+C gracefully
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await client.disconnect();
  process.exit(0);
});
```

### 4. Authentication State

- **Check for existing sessions**: mcp-remote reuses OAuth tokens
- **Handle re-authentication**: When tokens expire, browser will reopen
- **Monitor connection state**: Watch for disconnect events

### 5. Production Considerations

- **Rate limiting**: Atlassian enforces usage limits (1000 requests/hour for Premium)
- **Error retry**: Implement exponential backoff for failed requests
- **Logging**: Log tool calls and responses for debugging
- **Security**: Never log authentication tokens or sensitive data

## Example Integration

### VS Code Extension Configuration

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"]
    }
  }
}
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"]
    }
  }
}
```

## Conclusion

Successfully connecting to the Atlassian MCP server requires:

1. **Using the official mcp-remote proxy** (not direct connections)
2. **Completing OAuth 2.1 authentication** in browser
3. **Using correct tool names** from the server's tool list
4. **Proper response parsing** with type checking
5. **Graceful error handling** and connection management

The key insight is that Atlassian provides the `mcp-remote` tool specifically to handle the complex authentication and transport details, allowing custom clients to focus on business logic rather than protocol implementation.

This approach ensures compatibility with Atlassian's security requirements while providing a robust foundation for building custom integrations.
