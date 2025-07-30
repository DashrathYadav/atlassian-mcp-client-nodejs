# Atlassian MCP Client Implementation Plan

## Overview

This project implements a Model Context Protocol (MCP) client for Atlassian's Remote MCP Server, enabling interaction with Jira and Confluence through natural language.

## Research Summary

### Key Findings from Atlassian Documentation:

- **Server Endpoint**: `https://mcp.atlassian.com/v1/sse`
- **Authentication**: OAuth 2.1 with browser-based authorization flow
- **Transport**: Server-Sent Events (SSE) protocol
- **Requirements**: Node.js v18+, `mcp-remote` CLI, browser for OAuth
- **Capabilities**: Search, create, update Jira issues and Confluence pages

### Implementation Approaches:

#### Approach 1: Direct SSE Client (Recommended)

- Use `@modelcontextprotocol/sdk` SSE client transport
- Implement OAuth 2.1 authentication flow
- Handle browser-based authorization
- Direct connection to `https://mcp.atlassian.com/v1/sse`

#### Approach 2: mcp-remote CLI Wrapper

- Use the official `mcp-remote` CLI as a proxy
- Implement local MCP client connecting to proxy
- Less control but potentially more stable

#### Approach 3: VS Code Integration

- Use VS Code's built-in MCP support
- Configure via `mcp.json` settings
- Leverage existing VS Code MCP infrastructure

## Project Structure

```
atlassian-mcp-client/
├── src/
│   ├── client/
│   │   ├── atlassian-client.ts          # Main Atlassian MCP client
│   │   ├── auth/
│   │   │   ├── oauth-provider.ts        # OAuth 2.1 implementation
│   │   │   └── auth-handler.ts          # Authorization flow handler
│   │   └── transport/
│   │       └── sse-transport.ts         # SSE transport wrapper
│   ├── tools/
│   │   ├── jira-tools.ts               # Jira interaction tools
│   │   └── confluence-tools.ts         # Confluence interaction tools
│   ├── config/
│   │   └── atlassian-config.ts         # Configuration management
│   ├── examples/
│   │   ├── jira-demo.ts               # Jira usage examples
│   │   ├── confluence-demo.ts         # Confluence usage examples
│   │   └── interactive-cli.ts         # Interactive CLI demo
│   └── utils/
│       ├── logger.ts                  # Logging utilities
│       └── error-handler.ts           # Error handling
├── config/
│   ├── default.json                   # Default configuration
│   └── atlassian-credentials.json     # Credentials template
├── scripts/
│   ├── setup.sh                      # Setup script
│   └── start-demo.sh                 # Demo launcher
├── docs/
│   ├── SETUP.md                      # Setup instructions
│   ├── AUTHENTICATION.md             # Auth configuration guide
│   └── API_REFERENCE.md              # API documentation
├── tests/
│   ├── unit/                         # Unit tests
│   └── integration/                  # Integration tests
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Implementation Phases

### Phase 1: Core Infrastructure

1. **Project Setup**

   - Initialize Node.js/TypeScript project
   - Install dependencies (`@modelcontextprotocol/sdk`, etc.)
   - Configure build system

2. **Authentication System**

   - Implement OAuth 2.1 provider
   - Handle browser authorization flow
   - Token management and refresh

3. **Basic MCP Client**
   - SSE transport implementation
   - Connection to Atlassian remote server
   - Basic tool discovery

### Phase 2: Jira Integration

1. **Core Jira Tools**

   - Search issues
   - Create issues
   - Update issues
   - Get issue details

2. **Advanced Jira Features**
   - Bulk operations
   - Comments and attachments
   - Project management
   - Custom fields handling

### Phase 3: Confluence Integration

1. **Core Confluence Tools**

   - Search pages/spaces
   - Create pages
   - Update pages
   - Get page content

2. **Advanced Confluence Features**
   - Space management
   - Attachments handling
   - Permissions checking

### Phase 4: User Experience

1. **CLI Interface**

   - Interactive command-line tool
   - Batch operation support
   - Configuration management

2. **Examples and Documentation**
   - Usage examples
   - Integration guides
   - Best practices

### Phase 5: Testing and Optimization

1. **Testing Suite**

   - Unit tests
   - Integration tests
   - OAuth flow testing

2. **Performance and Reliability**
   - Error handling
   - Retry mechanisms
   - Rate limiting compliance

## Technical Requirements

### Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "typescript": "^5.0.0",
  "node-fetch": "^3.0.0",
  "dotenv": "^16.0.0",
  "commander": "^11.0.0",
  "inquirer": "^9.0.0",
  "chalk": "^5.0.0",
  "open": "^10.0.0"
}
```

### Environment Variables

```
ATLASSIAN_SITE_URL=your-site.atlassian.net
ATLASSIAN_CLIENT_ID=your-oauth-app-id
ATLASSIAN_CLIENT_SECRET=your-oauth-secret
ATLASSIAN_REDIRECT_URI=http://localhost:3000/callback
LOG_LEVEL=info
```

### Configuration

- Support for multiple Atlassian sites
- Flexible authentication options
- Customizable tool configurations
- Rate limiting settings

## Success Criteria

1. **Functional Requirements**

   - Successfully connect to Atlassian Remote MCP Server
   - Complete OAuth 2.1 authentication flow
   - Execute basic Jira and Confluence operations
   - Handle errors gracefully

2. **Non-Functional Requirements**

   - Response time < 2 seconds for typical operations
   - Proper error messages and logging
   - Secure credential handling
   - Comprehensive documentation

3. **Integration Requirements**
   - Work with VS Code MCP integration
   - Compatible with Claude Desktop
   - Extensible for other MCP clients

## Known Limitations

1. **Beta Constraints**

   - Rate limits (Standard: moderate, Premium/Enterprise: 1,000 requests/hour)
   - Custom Jira fields may need explicit setup
   - Workspace switching not available in single session

2. **Authentication Requirements**
   - Browser required for OAuth flow
   - Tokens are session-based
   - Site-level permissions needed

## Next Steps

1. Set up the basic project structure
2. Implement OAuth 2.1 authentication
3. Create basic SSE client connection
4. Test with simple Jira operations
5. Expand to full feature set

This plan provides a comprehensive roadmap for building a robust Atlassian MCP client that leverages the official Remote MCP Server while providing excellent developer experience.
