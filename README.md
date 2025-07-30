# Atlassian MCP Client

A TypeScript implementation of a Model Context Protocol (MCP) client specifically designed to work with Atlassian's Remote MCP Server, enabling seamless integration with Jira and Confluence through natural language interactions.

## 🚀 Features

- **Direct Integration**: Connects directly to Atlassian's Remote MCP Server (`https://mcp.atlassian.com/v1/sse`)
- **OAuth 2.1 Authentication**: Secure browser-based authorization flow
- **Jira Operations**: Search, create, update issues; manage projects and custom fields
- **Confluence Operations**: Search, create, update pages and spaces
- **Interactive CLI**: User-friendly command-line interface
- **VS Code Integration**: Compatible with VS Code MCP extensions
- **TypeScript**: Full type safety and excellent developer experience

## 📋 Prerequisites

- Node.js v18 or higher
- An Atlassian Cloud site with Jira and/or Confluence
- Atlassian app credentials (OAuth 2.0 app)
- Modern browser for OAuth authorization

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone <your-repo-url>
   cd atlassian-mcp-client
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your Atlassian credentials
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## ⚙️ Configuration

### 1. Create Atlassian OAuth App

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new app or use an existing one
3. Add OAuth 2.0 (3LO) authorization
4. Set redirect URI to `http://localhost:3000/callback`
5. Copy your Client ID and Client Secret

### 2. Environment Variables

Edit your `.env` file:

```env
ATLASSIAN_SITE_URL=your-company.atlassian.net
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
ATLASSIAN_REDIRECT_URI=http://localhost:3000/callback
```

## 🚀 Usage

### Interactive CLI

Start the interactive command-line interface:

```bash
npm run demo:interactive
```

This will guide you through:

- Authentication setup
- Connecting to your Atlassian instance
- Available operations
- Sample queries

### Jira Demo

Run Jira-specific examples:

```bash
npm run demo:jira
```

Sample operations:

- "Find all open bugs in Project Alpha"
- "Create a story titled 'Redesign onboarding'"
- "Update issue ABC-123 to In Progress"

### Confluence Demo

Run Confluence-specific examples:

```bash
npm run demo:confluence
```

Sample operations:

- "Summarize the Q2 planning page"
- "Create a page titled 'Team Goals Q3'"
- "What spaces do I have access to?"

### Programmatic Usage

```typescript
import { AtlassianMCPClient } from "./src/client/atlassian-client.js";

const client = new AtlassianMCPClient({
  siteUrl: "your-company.atlassian.net",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
});

// Authenticate (opens browser)
await client.authenticate();

// Search Jira issues
const issues = await client.jira.searchIssues(
  "project = DEV AND status = Open"
);

// Create Confluence page
const page = await client.confluence.createPage({
  title: "Meeting Notes",
  content: "Today we discussed...",
  spaceKey: "TEAM",
});
```

## 🏗️ Architecture

### Core Components

- **AtlassianMCPClient**: Main client class coordinating all operations
- **OAuthProvider**: Handles OAuth 2.1 authentication flow
- **SSETransport**: Manages Server-Sent Events connection to Atlassian
- **JiraTools**: Jira-specific operations and utilities
- **ConfluenceTools**: Confluence-specific operations and utilities

### Authentication Flow

1. Client initiates OAuth flow
2. Browser opens for user authorization
3. User grants permissions on Atlassian
4. Authorization code exchanged for access token
5. Token used for subsequent MCP server requests

### MCP Communication

```
Client ←→ SSE Transport ←→ Atlassian MCP Server ←→ Jira/Confluence APIs
```

## 📖 API Reference

### Jira Operations

```typescript
// Search issues
await client.jira.searchIssues(jql: string)

// Create issue
await client.jira.createIssue(issueData: CreateIssueRequest)

// Update issue
await client.jira.updateIssue(issueKey: string, updateData: UpdateIssueRequest)

// Get issue details
await client.jira.getIssue(issueKey: string)

// Add comment
await client.jira.addComment(issueKey: string, comment: string)
```

### Confluence Operations

```typescript
// Search content
await client.confluence.searchContent(query: string)

// Create page
await client.confluence.createPage(pageData: CreatePageRequest)

// Update page
await client.confluence.updatePage(pageId: string, updateData: UpdatePageRequest)

// Get page content
await client.confluence.getPage(pageId: string)

// List spaces
await client.confluence.getSpaces()
```

## 🔧 VS Code Integration

Add to your VS Code `settings.json` or workspace `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "atlassian": {
        "command": "node",
        "args": [
          "/path/to/atlassian-mcp-client/dist/index.js",
          "--vscode-mode"
        ],
        "env": {
          "ATLASSIAN_SITE_URL": "your-company.atlassian.net",
          "ATLASSIAN_CLIENT_ID": "your-client-id",
          "ATLASSIAN_CLIENT_SECRET": "your-client-secret"
        }
      }
    }
  }
}
```

## 🧪 Testing

Run the test suite:

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

## 🔍 Troubleshooting

### Common Issues

1. **OAuth Authorization Failed**

   - Verify redirect URI matches exactly
   - Check client ID and secret
   - Ensure browser can access localhost:3000

2. **Connection Timeout**

   - Check internet connectivity
   - Verify Atlassian site URL
   - Try refreshing authentication

3. **Permission Denied**
   - Ensure user has access to requested Jira/Confluence resources
   - Check OAuth app permissions

### Debug Mode

Enable debug logging:

```bash
DEBUG_MODE=true npm run demo:interactive
```

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [Authentication Configuration](./docs/AUTHENTICATION.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Integration Examples](./docs/EXAMPLES.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- Check [Atlassian Community](https://community.atlassian.com/) for general Atlassian issues
- Review [MCP Specification](https://modelcontextprotocol.io/) for protocol details
- Open an issue for bugs or feature requests

## 🎯 Roadmap

- [ ] Support for advanced Jira workflows
- [ ] Confluence templates and macros
- [ ] Bulk operations optimization
- [ ] Custom field mapping
- [ ] Multi-site support
- [ ] Claude Desktop integration
- [ ] Real-time notifications

---

Built with ❤️ for the Atlassian and MCP communities.
