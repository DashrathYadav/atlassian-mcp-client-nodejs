# Atlassian MCP Client

A simple and elegant AI-powered Model Context Protocol (MCP) client for Atlassian's Remote MCP Server. This client provides direct access to Jira and Confluence through natural language queries, leveraging AWS Bedrock Claude Sonnet 4 for intelligent decision-making and multi-step execution.

## 🚀 Features

- **AI-Powered Queries**: Natural language interaction with Jira and Confluence using Claude Sonnet 4
- **Cross-Region Inference**: Leverages AWS Bedrock's cross-region inference for better performance and reliability
- **Dynamic Tool Discovery**: Automatically discovers available MCP tools
- **Simple and Clean Interface**: Easy-to-use CLI for Atlassian operations
- **Error Recovery**: AI-powered error detection and recovery suggestions

## 🎯 Quick Start

### Prerequisites

1. **Atlassian OAuth App**: Create an OAuth app in your Atlassian Cloud instance
2. **AWS Bedrock Access**: Ensure you have access to AWS Bedrock with Claude Sonnet 4 (using cross-region inference for APAC)
3. **AWS Credentials**: Configure AWS access keys with Bedrock permissions
4. **Node.js 18+**: Ensure you have Node.js 18 or higher installed

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
npm run test:bedrock


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
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-south-1

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
2. **BedrockClient**: AI capabilities for query analysis and response formatting using Claude Sonnet 4 (with cross-region inference)
3. **AtlassianMCPClient**: Direct MCP tool communication

### Data Flow

1. **User Query** → SimpleAIAtlassianCLI
2. **AI Analysis** → BedrockClient.analyzeQuery()
3. **Tool Execution** → AtlassianMCPClient.callTool()
4. **Response Formatting** → BedrockClient.formatResponse()
5. **User Response** → Display formatted result

## 🧪 Testing

```bash
# Test basic AI integration
npm run test:bedrock

# Test MCP connection
npm run connect

# List available tools
npm run tools
```

## 🔍 Troubleshooting

### Common Issues

1. **AWS credentials not found**
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

## 🎯 **Key Benefits of Claude Sonnet 4 with Cross-Region Inference**

Based on the [AWS blog articles](https://aws.amazon.com/blogs/aws/claude-opus-4-anthropics-most-powerful-model-for-coding-is-now-in-amazon-bedrock/) and [cross-region inference guide](https://aws.amazon.com/blogs/machine-learning/getting-started-with-cross-region-inference-in-amazon-bedrock/):

- **Optimized for efficiency at scale** - perfect for production workloads
- **Enhanced performance** for code reviews, bug fixes, and feature development
- **Hybrid reasoning models** with near-instant responses and extended thinking
- **Cross-region inference** - automatically routes requests across APAC regions for better throughput
- **Up to double the default in-region quotas** when using cross-region inference
- **No additional cost** - same pricing as in-region inference
- **Automatic failover** - if one region is busy, requests are routed to available regions
- **Available in APAC regions** including your `ap-south-1` region with `apac.` prefix

## 🙏 Acknowledgments

- Atlassian for the MCP server and `mcp-remote` proxy
- AWS for the Bedrock Claude Sonnet 4 API with cross-region inference
- The MCP community for the protocol specification
