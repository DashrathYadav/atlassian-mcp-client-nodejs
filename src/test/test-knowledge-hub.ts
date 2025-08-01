#!/usr/bin/env node

import dotenv from 'dotenv';
import chalk from 'chalk';
import { KnowledgeHubClient } from '../ai/knowledge-hub-client.js';
import { BedrockClient } from '../ai/bedrock-client.js';
import { MultiServerMCPManager } from '../client/multi-server-mcp-manager.js';
import { EnhancedToolDispatcher } from '../routing/enhanced-tool-dispatcher.js';

// Load environment variables
dotenv.config();

async function testKnowledgeHubIntegration() {
    console.log(chalk.blue.bold('🧪 Testing Knowledge Hub Integration'));
    console.log(chalk.gray('====================================='));

    // Check environment variables
    const requiredEnvVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'BEDROCK_KB_ID',
        'BEDROCK_MODEL_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.log(chalk.red('❌ Missing required environment variables:'));
        missingVars.forEach(varName => console.log(chalk.red(`   - ${varName}`)));
        console.log(chalk.yellow('\nPlease add these to your .env file and try again.'));
        return;
    }

    try {
        // Initialize clients
        console.log(chalk.gray('\n1. Initializing clients...'));

        const bedrock = new BedrockClient({
            region: process.env['AWS_REGION'] || 'ap-south-1',
            accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
            secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!
        });

        const knowledgeHub = new KnowledgeHubClient({
            region: process.env['AWS_REGION'] || 'ap-south-1',
            knowledgeBaseId: process.env['BEDROCK_KB_ID']!,
            modelArn: process.env['BEDROCK_MODEL_ID']!,
            accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
            secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!
        });

        const mcpManager = new MultiServerMCPManager();

        // Test individual components
        console.log(chalk.gray('\n2. Testing Bedrock connection...'));
        const bedrockOk = await bedrock.testConnection();
        if (!bedrockOk) {
            console.log(chalk.red('❌ Bedrock connection failed'));
            return;
        }
        console.log(chalk.green('✅ Bedrock connection successful'));

        console.log(chalk.gray('\n3. Testing Knowledge Hub connection...'));
        const khOk = await knowledgeHub.testConnection();
        if (!khOk) {
            console.log(chalk.red('❌ Knowledge Hub connection failed'));
            return;
        }
        console.log(chalk.green('✅ Knowledge Hub connection successful'));

        // Test direct Knowledge Hub query
        console.log(chalk.gray('\n4. Testing direct Knowledge Hub query...'));
        const testQuery = 'What is this knowledge base about?';
        console.log(chalk.gray(`Query: "${testQuery}"`));

        const khResponse = await knowledgeHub.query(testQuery);
        console.log(chalk.green('✅ Knowledge Hub response:'));
        console.log(chalk.white(khResponse.result));

        if (khResponse.citations && khResponse.citations.length > 0) {
            console.log(chalk.gray(`Citations: ${khResponse.citations.length} found`));
        }

        // Test enhanced dispatcher (without MCP servers for simplicity)
        console.log(chalk.gray('\n5. Testing Enhanced Tool Dispatcher...'));
        const dispatcher = new EnhancedToolDispatcher(mcpManager, knowledgeHub, bedrock);

        const testQueries = [
            'What are our API specifications?',
            'Tell me about Amadeus integration',
            'What are our organization policies?',
            'Hello, how are you?'
        ];

        for (const query of testQueries) {
            console.log(chalk.gray(`\nTesting query: "${query}"`));
            try {
                const response = await dispatcher.processQuery(query);
                console.log(chalk.green('✅ Response:'));
                console.log(chalk.white(response.slice(0, 200) + (response.length > 200 ? '...' : '')));
            } catch (error) {
                console.log(chalk.red('❌ Error:'), error);
            }
        }

        console.log(chalk.green('\n🎉 Knowledge Hub integration test completed successfully!'));

    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error);
    }
}

// Run the test
testKnowledgeHubIntegration().catch(console.error); 