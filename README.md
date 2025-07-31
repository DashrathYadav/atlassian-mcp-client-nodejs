# Atlassian MCP Client

A simple and elegant AI-powered Model Context Protocol (MCP) client for Atlassian's Remote MCP Server. This client provides direct access to Jira and Confluence through natural language queries, leveraging Google Gemini AI for intelligent decision-making and multi-step execution.

## 🚀 Features

- **AI-Powered Queries**: Natural language interaction with Jira and Confluence
- **Dynamic Tool Discovery**: Automatically discovers available MCP tools
- **Simple and Clean Interface**: Easy-to-use CLI for Atlassian operations
- **Error Recovery**: AI-powered error detection and recovery suggestions

## 🎯 Quick Start

### Prerequisites

1. **Atlassian OAuth App**: Create an OAuth app in your Atlassian Cloud instance
2. **Google Gemini API Key**: Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Node.js 18+**: Ensure you have Node.js 18 or higher installed

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd atlassian-mcp-client

# Install dependencies
npm install

# Set up authentication (interactive setup)
npm run setup

# Or manually create .env file (see AUTHENTICATION_SETUP.md)
```

### Usage

#### AI-Powered Session

```bash
# Start AI session
npm run ai
```

This mode provides:
- **Natural language queries** for Jira and Confluence
- **AI-powered decision making** for tool selection
- **Simple and clean interface** for Atlassian operations

#### Basic Operations

```bash
# Test authentication
npm run auth:test

# Test connection
npm run connect

# List available tools
npm run tools

# Test AI integration
npm run test:gemini


```

## 🧠 AI Features

### Natural Language Processing
The AI can understand and process natural language queries:

```
"Show me all open tickets"
"Get details for ticket MD-1"
"List all projects"
```

### Intelligent Tool Selection
The AI automatically selects the appropriate MCP tools based on your query:

- **Smart Analysis**: Analyzes your request and chooses the right tools
- **Error Recovery**: Suggests alternative actions when operations fail
- **Response Formatting**: Formats responses in a user-friendly way



## 🔧 Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key

# Atlassian OAuth (for mcp-remote)
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
```

### MCP Configuration

The client uses the official `mcp-remote` proxy to handle OAuth authentication and establish the SSE connection to Atlassian's MCP server.

## 📊 Example Interactions

```
> Show me all open tickets
✅ Found 15 open tickets in your project

> Get ticket MD-1
✅ Retrieved ticket MD-1: Database connection issue

> Find high priority bugs
✅ Found 3 high priority bugs that need attention

> List all projects
✅ Found 5 projects in your Atlassian instance
```

## 🏗️ Architecture

### Core Components

1. **SimpleAIAtlassianCLI**: Main interface for AI-powered interactions
2. **GeminiClient**: AI capabilities for query analysis and response formatting
3. **AtlassianMCPClient**: Direct MCP tool communication

### Data Flow

1. **User Query** → SimpleAIAtlassianCLI
2. **AI Analysis** → GeminiClient.analyzeQuery()
3. **Tool Execution** → AtlassianMCPClient.callTool()
4. **Response Formatting** → GeminiClient.formatResponse()
5. **User Response** → Display formatted result

## 🧪 Testing

```bash
# Test basic AI integration
npm run test:gemini

# Test MCP connection
npm run connect

# List available tools
npm run tools
```

## 🔍 Troubleshooting

### Common Issues

1. **GEMINI_API_KEY not found**
   - Ensure the environment variable is set correctly
   - Check that the API key is valid

2. **MCP connection failed**
   - Verify Atlassian OAuth credentials
   - Check network connectivity
   - Ensure `mcp-remote` is accessible

3. **Tool calls failing**
   - Verify `cloudId` is being set automatically
   - Check tool parameter requirements
   - Review MCP server logs

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=atlassian-mcp-client:*
```

## 📈 Roadmap

- [ ] **Web UI**: Browser-based interface for AI interactions
- [ ] **Batch Processing**: Handle multiple queries simultaneously
- [ ] **Custom Workflows**: User-defined execution patterns
- [ ] **Integration APIs**: REST API for external integrations
- [ ] **Advanced Analytics**: Detailed execution analytics and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Atlassian for the MCP server and `mcp-remote` proxy
- Google for the Gemini AI API
- The MCP community for the protocol specification
