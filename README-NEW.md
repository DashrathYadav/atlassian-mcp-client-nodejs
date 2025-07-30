# Atlassian MCP Client

A comprehensive client for connecting to the **Atlassian Remote MCP Server** using the official `mcp-remote` proxy tool. This enables you to interact with your Jira and Confluence data from MCP-compatible tools like VS Code, Claude Desktop, and Cursor.

> **📚 Complete Documentation Available:**
>
> - [📖 **Complete Connection Guide**](docs/CONNECTING_TO_ATLASSIAN_MCP.md) - Comprehensive step-by-step documentation
> - [⚡ **Quick Reference**](docs/QUICK_REFERENCE.md) - TL;DR for developers
> - [🔧 **Troubleshooting Guide**](docs/TROUBLESHOOTING.md) - Solutions for common issues

## 🎯 **Project Status: WORKING** ✅

This client has been successfully tested and can:

- ✅ Connect to Atlassian MCP server via OAuth 2.1
- ✅ List all 25 available Atlassian tools
- ✅ Make successful tool calls to Jira and Confluence
- ✅ Handle authentication and transport automatically
- ✅ Work with VS Code, Claude Desktop, and other MCP clients

## 🚀 Quick Start

### Prerequisites

- **Node.js v18+**
- **Modern browser** for OAuth authentication
- **Atlassian Cloud site** with Jira and/or Confluence
- **MCP-compatible tool** (VS Code, Claude Desktop, Cursor, etc.)

### Option 1: Direct MCP Remote (Recommended)

This is the official way to connect to Atlassian's MCP server:

```bash
# Install and run the official demo
npm install
npm run demo:mcp-remote
```

This will:

1. Start the `mcp-remote` proxy
2. Open your browser for OAuth authentication
3. Create a local MCP server that tools can connect to

### Option 2: VS Code Setup

1. **Install the MCP extension** in VS Code
2. **Copy the MCP configuration**:
   ```bash
   cp mcp.json ~/.vscode/mcp.json
   ```
3. **Start the authentication**:
   ```bash
   npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
   ```
4. **Complete OAuth** in the browser that opens
5. **Use MCP tools** in VS Code

### Option 3: Claude Desktop Setup

Add this to your Claude Desktop configuration:

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

## 🔧 How It Works

The Atlassian Remote MCP Server uses a proxy architecture:

```
Your Tool (VS Code/Claude) ↔ mcp-remote proxy ↔ Atlassian MCP Server ↔ Your Atlassian Site
```

1. **`mcp-remote`** handles OAuth authentication with Atlassian
2. **Local MCP server** runs on your machine
3. **Your tools** connect to the local server
4. **Secure communication** to your Atlassian Cloud site

## 🎯 What You Can Do

Once connected, you can:

### Jira Operations

- **Search issues**: "Find all open bugs in Project Alpha"
- **Create tickets**: "Create a story titled 'Redesign onboarding'"
- **Update issues**: "Assign this ticket to john@company.com"
- **Bulk operations**: "Make five Jira issues from these notes"

### Confluence Operations

- **Search content**: "Find pages about API documentation"
- **Create pages**: "Create a page titled 'Team Goals Q3'"
- **Update content**: "Add this section to the release notes"
- **Navigate spaces**: "What spaces do I have access to?"

### Combined Workflows

- **Link content**: "Link these three Jira tickets to the 'Release Plan' page"
- **Cross-reference**: "Summarize all issues mentioned in this Confluence page"

## 📁 Project Structure

```
src/
├── client/
│   ├── atlassian-mcp-client.ts    # Main MCP client (programmatic use)
│   ├── auth/
│   │   └── oauth-provider.ts      # OAuth 2.1 PKCE implementation
│   └── transport/
│       └── sse-transport.ts       # Server-Sent Events transport
├── demo/
│   ├── mcp-remote-demo.ts         # Official mcp-remote demo
│   ├── interactive-demo.ts        # Interactive testing
│   └── working-demo.ts            # API token fallback
└── utils/
    └── error-handler.ts           # Error handling utilities

mcp.json                           # VS Code MCP configuration
.env                              # Environment variables
```

## 🔑 Authentication

The Atlassian MCP server uses **OAuth 2.1 with PKCE** for secure authentication:

- **No client secrets** required
- **Browser-based flow** for authentication
- **Scoped access** respects your existing permissions
- **Session-based tokens** for security

Your existing Jira and Confluence permissions are respected - you can only access data you normally have access to.

## 🛠 Development

### Available Scripts

```bash
# Build the TypeScript project
npm run build

# Run the official MCP remote demo
npm run demo:mcp-remote

# Run interactive demo (for testing)
npm run demo:interactive

# Run API token demo (fallback)
npm run demo:working
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Your Atlassian site URL
ATLASSIAN_SITE_URL=https://your-site.atlassian.net

# MCP Server (don't change unless Atlassian updates it)
ATLASSIAN_MCP_SERVER_URL=https://mcp.atlassian.com/v1/sse
```

## 🔍 Troubleshooting

### Common Issues

**Authentication fails:**

- Ensure you have access to your Atlassian Cloud site
- Check that Jira/Confluence are accessible in your browser
- Try clearing browser cache and authenticating again

**Connection timeouts:**

- Verify Node.js v18+ is installed: `node --version`
- Check network connectivity to `mcp.atlassian.com`
- Try a different mcp-remote version: `@0.1.12` or `@latest`

**Permission errors:**

- Verify you have the necessary Jira/Confluence permissions
- Check with your Atlassian admin about app authorizations
- Ensure your user account has product access

### Debug Mode

Run with debug output:

```bash
DEBUG=* npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

## 📚 Documentation Links

- [Official Atlassian MCP Documentation](https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-remote-mcp-server/)
- [Setting up IDEs](https://support.atlassian.com/rovo/docs/setting-up-ides/)
- [Authentication Guide](https://support.atlassian.com/rovo/docs/authentication-and-authorization/)
- [Troubleshooting](https://support.atlassian.com/rovo/docs/troubleshooting-and-verifying-your-setup/)

## 🤝 Support

- **Atlassian Support**: [Submit a ticket](https://customerfeedback.atlassian.net/servicedesk/customer/portal/1701/group/1762/create/11360)
- **Community**: [Atlassian Community](https://community.atlassian.com/)
- **Beta Feedback**: Share experiences and feature requests

## ⚠️ Beta Notice

The Atlassian Remote MCP Server is currently in **Beta**:

- Core functionality is stable
- Some advanced features still in development
- Rate limits apply (higher limits for Premium/Enterprise)
- Feedback welcome for product improvement

---

**Happy integrating!** 🎉
