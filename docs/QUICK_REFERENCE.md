# Quick Reference: Atlassian MCP Server Integration

## TL;DR - Working Connection Steps

### 1. Install & Run Proxy

```bash
npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

### 2. Complete OAuth in Browser

- Browser opens automatically
- Login with Atlassian account
- Grant permissions
- Authentication completes

### 3. Create Custom Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client(
  { name: "my-client", version: "1.0.0" },
  { capabilities: {} }
);

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"],
});

await client.connect(transport);
```

### 4. Use Correct Tool Names

```typescript
// ✅ CORRECT
await client.callTool({ name: "getVisibleJiraProjects", arguments: {} });
await client.callTool({
  name: "searchJiraIssuesUsingJql",
  arguments: { jql: "project = DEMO" },
});
await client.callTool({ name: "getConfluenceSpaces", arguments: {} });

// ❌ WRONG
await client.callTool({ name: "jira_get_projects", arguments: {} });
await client.callTool({ name: "jira_search_issues", arguments: {} });
```

## Essential Tool Names

| Function               | Correct Tool Name          |
| ---------------------- | -------------------------- |
| Get Jira Projects      | `getVisibleJiraProjects`   |
| Search Jira Issues     | `searchJiraIssuesUsingJql` |
| Create Jira Issue      | `createJiraIssue`          |
| Get Confluence Spaces  | `getConfluenceSpaces`      |
| Search Confluence      | `searchConfluenceUsingCql` |
| Create Confluence Page | `createConfluencePage`     |
| Get User Info          | `atlassianUserInfo`        |

## Connection Success Indicators

Look for these messages:

```
✅ Connected to remote server using SSEClientTransport
✅ Local STDIO server running
✅ Proxy established successfully
✅ Available tools: [25 tools listed]
```

## Common Error Solutions

### "Tool not found" → Use correct tool names

### "tsx command not found" → Use `npx tsx`

### Connection hangs → Kill mcp-remote processes and restart

### 404 errors → Normal! It falls back to SSE transport

## Working Code Template

```typescript
export class AtlassianMCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  constructor() {
    this.client = new Client(
      { name: "atlassian-client", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  async connect(): Promise<void> {
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"],
    });

    await this.client.connect(this.transport);
    this.isConnected = true;
  }

  async getJiraProjects(): Promise<any[]> {
    const response = await this.client.callTool({
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
  }
}
```

## Test Your Connection

```bash
# 1. Start proxy
npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse

# 2. In another terminal, test client
npx tsx your-client-test.ts
```

## All 25 Available Tools

```
atlassianUserInfo, getAccessibleAtlassianResources, getConfluenceSpaces,
getConfluencePage, getPagesInConfluenceSpace, getConfluencePageAncestors,
getConfluencePageFooterComments, getConfluencePageInlineComments,
getConfluencePageDescendants, createConfluencePage, updateConfluencePage,
createConfluenceFooterComment, createConfluenceInlineComment,
searchConfluenceUsingCql, getJiraIssue, editJiraIssue, createJiraIssue,
getTransitionsForJiraIssue, transitionJiraIssue, lookupJiraAccountId,
searchJiraIssuesUsingJql, addCommentToJiraIssue, getJiraIssueRemoteIssueLinks,
getVisibleJiraProjects, getJiraProjectIssueTypesMetadata
```
