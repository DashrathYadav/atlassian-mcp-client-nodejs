# Atlassian MCP Client

A simple and elegant AI-powered Model Context Protocol (MCP) client for Atlassian's Remote MCP Server. This client provides direct access to Jira and Confluence through natural language queries, leveraging Google Gemini AI for intelligent decision-making and multi-step execution.

## 🚀 Features

- **AI-Powered Queries**: Natural language interaction with Jira and Confluence
- **Enhanced Multi-Step Execution**: Complex queries with real-time AI decision making
- **Dynamic Tool Discovery**: Automatically discovers available MCP tools
- **Real-Time Dashboard**: Interactive UI for monitoring and controlling execution
- **Data Preservation**: Complete audit trail of all operations
- **Error Recovery**: AI-powered error detection and recovery suggestions
- **Strategy Optimization**: Continuous improvement of execution strategies

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

# Set up environment variables
export GEMINI_API_KEY="your-gemini-api-key"
export ATLASSIAN_CLIENT_ID="your-atlassian-client-id"
export ATLASSIAN_CLIENT_SECRET="your-atlassian-client-secret"
```

### Usage

#### Enhanced AI-Powered Multi-Step Execution (Recommended)

```bash
# Start enhanced interactive session
npm run enhanced
```

This mode provides:
- **Real-time AI decision making** based on intermediate results
- **Interactive dashboard** showing progress and AI reasoning
- **User control** over each step with alternatives
- **Complete data preservation** and audit trail
- **Error recovery** with AI suggestions

#### Simple AI-Powered Session

```bash
# Start simple AI session
npm run ai
```

#### Basic Operations

```bash
# Test connection
npm run connect

# List available tools
npm run tools

# Test AI integration
npm run test:gemini

# Test enhanced AI
npm run test:enhanced
```

## 🧠 Enhanced AI Features

### Multi-Step Execution
The enhanced mode can handle complex queries that require multiple steps:

```
"Find all high priority bugs, check if they're assigned to John, 
and assign unassigned ones to him"
```

This query would be broken down into:
1. Search for high priority bugs
2. Check current assignees
3. Identify unassigned bugs
4. Assign unassigned bugs to John

### Real-Time Decision Making
The AI makes decisions based on actual results from previous steps:

- **Dynamic Strategy**: Adapts approach based on intermediate results
- **Error Recovery**: Suggests alternative actions when operations fail
- **Data Validation**: Validates results and suggests improvements
- **Insight Generation**: Provides insights about patterns and opportunities

### Interactive Dashboard
The enhanced CLI provides a real-time dashboard showing:

- **Progress**: Current step and overall progress
- **AI Analysis**: Understanding, accomplishments, and remaining tasks
- **Current Data**: Recent results and accumulated information
- **AI Recommendations**: Suggested next actions with reasoning
- **Alternatives**: Alternative approaches when available
- **Insights**: AI-generated insights about the data

### User Control Options
At each step, users can:

- ✅ **Execute AI recommendation**: Proceed with AI's suggested action
- 🔄 **Choose alternative**: Select from AI-provided alternatives
- ⚙️ **Modify parameters**: Adjust action parameters
- 📊 **Deep analysis**: Pause and analyze current state
- ❌ **Stop execution**: Halt the process

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

### Enhanced Mode Examples

```
🤖 AI-Powered Multi-Step Execution
=====================================

Query: Find all high priority bugs and assign them to John

🧠 AI Analysis:
Understanding: Need to find high priority bugs and assign unassigned ones to John
Accomplished: None yet
Remaining: Search for bugs, check assignments, assign unassigned bugs
Confidence: 85%

🎯 AI Recommendation:
Search for high priority bugs using JQL
Reasoning: First step is to identify all high priority bugs
Confidence: 90%
Tool: searchJiraIssuesUsingJql

What would you like to do?
❯ ✅ Execute AI recommendation
  🔄 Choose alternative action
  ⚙️ Modify parameters
  📊 Deep analysis
  ❌ Stop execution
```

### Simple Mode Examples

```
> Show me all open tickets
✅ Found 15 open tickets in your project

> Get ticket MD-1
✅ Retrieved ticket MD-1: Database connection issue

> Find high priority bugs
✅ Found 3 high priority bugs that need attention
```

## 🏗️ Architecture

### Core Components

1. **EnhancedInteractiveCLI**: Main interface for multi-step execution
2. **EnhancedAI**: Advanced AI capabilities for decision making
3. **AtlassianMCPClient**: Direct MCP tool communication
4. **Execution History**: Complete audit trail and data preservation

### Data Flow

1. **User Query** → EnhancedInteractiveCLI
2. **AI Analysis** → EnhancedAI.analyzeContext()
3. **Action Suggestion** → EnhancedAI.suggestNextAction()
4. **User Decision** → Interactive Dashboard
5. **Tool Execution** → AtlassianMCPClient.callTool()
6. **Result Validation** → EnhancedAI.validateResult()
7. **History Update** → Execution History
8. **Insight Generation** → EnhancedAI.generateInsights()
9. **Completion Check** → EnhancedAI.checkCompletion()

## 🧪 Testing

```bash
# Test basic AI integration
npm run test:gemini

# Test enhanced AI capabilities
npm run test:enhanced

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

- [ ] **Web UI**: Browser-based interface for enhanced execution
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
