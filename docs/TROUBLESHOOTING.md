# Troubleshooting Guide: Atlassian MCP Server Connection

## Common Issues & Solutions

### 1. Command Not Found Errors

#### Problem: `zsh: command not found: tsx`

**Cause**: `tsx` is not globally installed
**Solution**:

```bash
# Use npx instead
npx tsx your-script.ts

# Or install globally
npm install -g tsx
```

#### Problem: `command not found: mcp-remote`

**Cause**: Tool not in PATH
**Solution**:

```bash
# Always use npx
npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

### 2. Tool Call Errors

#### Problem: `Tool jira_get_projects not found`

**Cause**: Using incorrect tool names
**Solution**: Use exact names from the server:

```typescript
// ❌ Wrong
"jira_get_projects";
"jira_search_issues";
"confluence_get_spaces";

// ✅ Correct
"getVisibleJiraProjects";
"searchJiraIssuesUsingJql";
"getConfluenceSpaces";
```

#### Problem: `MCP error -32602: Tool not found`

**Cause**: Typo in tool name or tool doesn't exist
**Solution**:

1. List available tools first:

```typescript
const tools = await client.listTools();
console.log(tools.tools.map((t) => t.name));
```

2. Use exact tool name from the list

### 3. TypeScript Compilation Errors

#### Problem: `Property 'length' does not exist on type '{}'`

**Cause**: MCP SDK response types are not specific enough
**Solution**: Always check array type:

```typescript
// ❌ Wrong
if (response.content && response.content.length > 0) {

// ✅ Correct
if (response.content && Array.isArray(response.content) && response.content.length > 0) {
```

#### Problem: `'error' is of type 'unknown'`

**Cause**: TypeScript strict error handling
**Solution**: Type the error:

```typescript
// ❌ Wrong
catch (error) {
  console.log(error.message);
}

// ✅ Correct
catch (error: any) {
  console.log(error?.message || error);
}
```

#### Problem: `The "file" argument must be of type string. Received undefined`

**Cause**: Incorrect StdioClientTransport parameters
**Solution**: Use command/args format:

```typescript
// ❌ Wrong
new StdioClientTransport({
  reader: process.stdout,
  writer: process.stdin,
});

// ✅ Correct
new StdioClientTransport({
  command: "npx",
  args: ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"],
});
```

### 4. Connection Issues

#### Problem: Connection hangs or times out

**Symptoms**: Process starts but never connects
**Solutions**:

1. **Kill existing processes**:

```bash
# Find mcp-remote processes
ps aux | grep mcp-remote
kill <process_id>
```

2. **Clear OAuth cache** (if authentication is stuck):

```bash
# Location varies by OS, but often in:
~/.cache/mcp-remote/
# Delete the directory and re-authenticate
```

3. **Check network connectivity**:

```bash
curl -I https://mcp.atlassian.com/v1/sse
```

#### Problem: "Error POSTing to endpoint (HTTP 404): Not Found"

**Status**: This is NORMAL and expected!
**Explanation**: The tool tries HTTP first, gets 404, then falls back to SSE transport
**What to do**: Wait for the fallback to complete, look for:

```
[xxxxx] Recursively reconnecting for reason: falling-back-to-alternate-transport
[xxxxx] Using transport strategy: sse-only
[xxxxx] Connected to remote server using SSEClientTransport
```

#### Problem: Authentication loops (browser keeps opening)

**Cause**: OAuth flow not completed properly
**Solutions**:

1. **Complete the full flow**: Don't cancel the browser authentication
2. **Clear browser cache** for Atlassian sites
3. **Use incognito/private browsing** to start fresh
4. **Check Atlassian account access**: Ensure you have Jira/Confluence permissions

### 5. OAuth & Authentication Issues

#### Problem: "Authentication required" repeating

**Cause**: OAuth tokens expired or invalid
**Solution**:

1. Complete fresh authentication in browser
2. Grant all requested permissions
3. Verify Atlassian site access in browser first

#### Problem: "Using existing client port" but still fails

**Cause**: Corrupted OAuth session
**Solution**:

```bash
# Kill all mcp-remote processes
pkill -f mcp-remote

# Start fresh (will trigger new OAuth)
npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

#### Problem: "Access denied" or permission errors

**Cause**: Insufficient Atlassian permissions
**Solution**:

1. Verify you have Jira/Confluence access
2. Check with Atlassian admin about permissions
3. Ensure your account has product access

### 6. Response Parsing Issues

#### Problem: `JSON.parse` errors on tool responses

**Cause**: Response content is not valid JSON
**Solution**: Always validate before parsing:

```typescript
if (
  response.content &&
  Array.isArray(response.content) &&
  response.content.length > 0
) {
  const content = response.content[0];
  if (content.type === "text" && content.text) {
    try {
      return JSON.parse(content.text);
    } catch (e) {
      console.error("Failed to parse response:", content.text);
      return null;
    }
  }
}
```

#### Problem: Empty responses from tools

**Cause**: Tool succeeded but returned no data
**Solution**: Check if you have access to the requested resources:

```typescript
// Test with basic user info first
const userInfo = await client.callTool({
  name: "atlassianUserInfo",
  arguments: {},
});
```

### 7. Process Management Issues

#### Problem: Multiple mcp-remote processes running

**Cause**: Previous processes not cleaned up
**Solution**:

```bash
# List all mcp-remote processes
ps aux | grep mcp-remote

# Kill all of them
pkill -f mcp-remote

# Start a single new instance
npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

#### Problem: Process exits unexpectedly

**Cause**: Network issues or server problems
**Solution**:

1. Check error messages in console
2. Verify internet connectivity
3. Try different mcp-remote version:

```bash
# Try older version
npx -y mcp-remote@0.1.12 https://mcp.atlassian.com/v1/sse

# Or latest
npx -y mcp-remote@latest https://mcp.atlassian.com/v1/sse
```

### 8. Development Environment Issues

#### Problem: VS Code not detecting MCP tools

**Cause**: MCP extension not installed or configured
**Solution**:

1. Install MCP extension: `code --install-extension modelcontextprotocol.mcp`
2. Configure in `mcp.json`:

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

## Diagnostic Commands

### Check Connection Status

```bash
# Verify mcp-remote is running
ps aux | grep mcp-remote

# Check port usage (default 5598)
lsof -i :5598

# Test network connectivity
curl -I https://mcp.atlassian.com/v1/sse
```

### Debug Mode

```bash
# Run with debug output
DEBUG=* npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

### Validate Tool Responses

```typescript
// Test basic connectivity
const tools = await client.listTools();
console.log(`Found ${tools.tools.length} tools`);

// Test authentication
const userInfo = await client.callTool({
  name: "atlassianUserInfo",
  arguments: {},
});
console.log("User info:", userInfo);
```

## Success Indicators

### Connection Success

Look for these messages:

```
✅ [xxxxx] Connected to remote server using SSEClientTransport
✅ [xxxxx] Local STDIO server running
✅ [xxxxx] Proxy established successfully between local STDIO and remote SSEClientTransport
```

### OAuth Success

```
✅ [xxxxx] Auth code received, resolving promise
✅ [xxxxx] Completing authorization...
✅ [xxxxx] Using existing client port: 5598
```

### Tool Discovery Success

```
✅ Available tools: [25 tools listed]
✅ Found tools: atlassianUserInfo, getAccessibleAtlassianResources, ...
```

## When to Contact Support

Contact Atlassian support if you see:

- Repeated "Resource server does not implement OAuth 2.0 Protected Resource Metadata" errors
- Server errors (5xx responses) from mcp.atlassian.com
- Persistent authentication failures after multiple attempts
- Rate limiting issues beyond documented limits

## Recovery Steps

### Complete Reset

1. Kill all mcp-remote processes: `pkill -f mcp-remote`
2. Clear OAuth cache (location varies by OS)
3. Clear browser cache for Atlassian sites
4. Restart with fresh authentication
5. Complete OAuth flow in browser
6. Test with simple tool call

### Verify Working State

```typescript
// This should work if everything is set up correctly
const client = new AtlassianMCPClient();
await client.connect();
const tools = await client.listTools();
const userInfo = await client.getUserInfo();
console.log("Everything working!");
```
