# Knowledge Hub Integration Setup

This document explains how to set up and configure the AWS Bedrock Knowledge Hub integration with your Atlassian MCP client.

## Overview

The Knowledge Hub integration allows the AI to query your organization's knowledge base for information about:
- API specifications and documentation
- Organization knowledge and processes
- Beneficiary information
- Merchant information (like Amadeus)
- General organizational data queries
- Company policies and procedures
- Technical documentation
- Best practices and guidelines

## Prerequisites

1. AWS Account with Bedrock access
2. AWS Bedrock Knowledge Base configured
3. AWS credentials with appropriate permissions

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here

# Knowledge Hub Configuration
BEDROCK_KB_ID=your-knowledge-base-id-here
BEDROCK_MODEL_ID=apac.anthropic.claude-sonnet-4-20250514-v1:0
```

## Configuration Steps

### 1. Set up AWS Bedrock Knowledge Base

1. Go to AWS Bedrock console
2. Navigate to Knowledge Bases
3. Create a new Knowledge Base or use an existing one
4. Note down the Knowledge Base ID

### 2. Configure Model ARN

The model ARN should point to a Claude model in your region. Example:
- `apac.anthropic.claude-sonnet-4-20250514-v1:0` (Asia Pacific)
- `us-east-1.anthropic.claude-sonnet-4-20250514-v1:0` (US East)

### 3. Set up AWS Credentials

Ensure your AWS credentials have the following permissions:
- `bedrock:InvokeModel`
- `bedrock-agent-runtime:RetrieveAndGenerate`

## Testing the Integration

Run the Knowledge Hub test to verify your setup:

```bash
npm run test:knowledge-hub
```

This will test:
- AWS Bedrock connection
- Knowledge Hub connection
- Direct Knowledge Hub queries
- Enhanced tool dispatcher integration

## Usage Examples

Once configured, you can ask questions like:

- "What are our API specifications?"
- "Tell me about Amadeus integration"
- "What are our organization policies?"
- "How do we handle beneficiary data?"
- "What are our technical best practices?"

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure all required environment variables are set
   - Check that the values are correct

2. **AWS Credentials Error**
   - Verify your AWS credentials are valid
   - Ensure you have the required permissions

3. **Knowledge Base Not Found**
   - Verify the Knowledge Base ID is correct
   - Ensure the Knowledge Base is in the same region as your AWS_REGION

4. **Model ARN Error**
   - Verify the model ARN is correct for your region
   - Ensure the model is available in your AWS account

### Debug Mode

To enable debug logging, set the `DEBUG` environment variable:

```bash
DEBUG=true npm run ai
```

## Architecture

The Knowledge Hub integration works as follows:

1. **User Query** → AI analyzes if it's a Knowledge Hub query
2. **Knowledge Hub Query** → Route to `KnowledgeHubClient.query()`
3. **MCP Tool Query** → Route to existing `MultiServerMCPManager`
4. **Response** → Format through `BedrockClient.formatResponse()`

## Files Added/Modified

- `src/ai/knowledge-hub-client.ts` - New Knowledge Hub client
- `src/routing/enhanced-tool-dispatcher.ts` - Enhanced dispatcher with Knowledge Hub support
- `src/cli/ai-cli.ts` - Updated CLI with Knowledge Hub integration
- `src/test/test-knowledge-hub.ts` - Test file for Knowledge Hub integration
- `package.json` - Added new dependency and test script 