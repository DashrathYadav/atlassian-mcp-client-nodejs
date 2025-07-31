#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import { BedrockClient, BedrockConfig } from '../ai/bedrock-client.js';

// Load environment variables
dotenv.config();

async function testBedrockIntegration() {
    console.log(chalk.blue.bold('🧪 Testing AWS Bedrock Claude Sonnet 4 Integration'));
    console.log(chalk.gray('===================================================='));

    const region = process.env['AWS_REGION'] || 'ap-south-1';
    const accessKeyId = process.env['AWS_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];

    if (!accessKeyId || !secretAccessKey) {
        console.error(chalk.red('❌ AWS credentials not found in environment variables'));
        console.log(chalk.yellow('Please add your AWS credentials to .env file:'));
        console.log(chalk.gray('AWS_ACCESS_KEY_ID=your-access-key'));
        console.log(chalk.gray('AWS_SECRET_ACCESS_KEY=your-secret-key'));
        console.log(chalk.gray('AWS_REGION=ap-south-1 (optional, defaults to ap-south-1)'));
        return;
    }

    const config: BedrockConfig = {
        region,
        accessKeyId,
        secretAccessKey
    };

    // Test 1: Basic Bedrock connection
    console.log(chalk.yellow('\n1. Testing AWS Bedrock connection...'));
    const bedrock = new BedrockClient(config);
    const connectionOk = await bedrock.testConnection();

    if (!connectionOk) {
        console.error(chalk.red('❌ Failed to connect to AWS Bedrock'));
        return;
    }

    // Test 2: Query analysis with mock tools
    console.log(chalk.yellow('\n2. Testing query analysis...'));
    const mockTools = [
        { name: 'searchJiraIssuesUsingJql', description: 'Search Jira issues using JQL query' },
        { name: 'getJiraIssue', description: 'Get specific ticket details by ID or key' },
        { name: 'getVisibleJiraProjects', description: 'List all accessible Jira projects' },
        { name: 'getConfluenceSpaces', description: 'List all accessible Confluence spaces' },
        { name: 'searchConfluenceUsingCql', description: 'Search Confluence content using CQL' }
    ];

    const testQueries = [
        'show me all open tickets',
        'get details for ticket MD-1',
        'list all projects',
        'find high priority bugs',
        'hello there',
        'what can you do?'
    ];

    for (const query of testQueries) {
        try {
            console.log(chalk.cyan(`\nQuery: "${query}"`));
            const analysis = await bedrock.analyzeQuery(query, mockTools);

            console.log(chalk.green('✅ Analysis successful:'));
            console.log(chalk.gray(`  Should call tool: ${analysis.shouldCallTool}`));
            if (analysis.toolName) {
                console.log(chalk.gray(`  Tool: ${analysis.toolName}`));
                console.log(chalk.gray(`  Parameters: ${JSON.stringify(analysis.parameters)}`));
            }
            if (analysis.response) {
                console.log(chalk.gray(`  Direct response: ${analysis.response}`));
            }
            console.log(chalk.gray(`  Reasoning: ${analysis.reasoning}`));

        } catch (error) {
            console.error(chalk.red(`❌ Error analyzing query "${query}":`, error));
        }
    }

    // Test 3: Response formatting
    console.log(chalk.yellow('\n3. Testing response formatting...'));
    const mockJiraData = {
        issues: [
            {
                key: 'MD-1',
                fields: {
                    summary: 'Do the Research on Jira mcp server',
                    status: { name: 'To Do' },
                    priority: { name: 'Highest' },
                    assignee: null,
                    created: '2025-01-28T10:00:00.000+0000'
                }
            }
        ]
    };

    try {
        const formattedResponse = await bedrock.formatResponse(
            mockJiraData,
            'show me all open tickets'
        );

        console.log(chalk.green('✅ Response formatted successfully:'));
        console.log(chalk.white(formattedResponse));
    } catch (error) {
        console.error(chalk.red('❌ Error formatting response:', error));
    }

    console.log(chalk.green.bold('\n🎉 AWS Bedrock Claude Sonnet 4 integration test complete!'));
    console.log(chalk.gray('You can now run the AI CLI with:'));
    console.log(chalk.white('npm run ai'));
}

// Run the test
testBedrockIntegration().catch(console.error); 