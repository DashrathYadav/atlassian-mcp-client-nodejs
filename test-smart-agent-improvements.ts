#!/usr/bin/env node

import { SmartAgent } from './src/ai/smart-agent.js';
import { BedrockClient } from './src/ai/bedrock-client.js';
import { MultiServerMCPManager } from './src/client/multi-server-mcp-manager.js';
import { KnowledgeHubClient } from './src/ai/knowledge-hub-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSmartAgentImprovements() {
    console.log('🧪 Testing Smart Agent Improvements...');

    try {
        // Initialize components
        const bedrockConfig = {
            region: process.env['AWS_REGION'] || 'ap-south-1',
            accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
            secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']
        };
        const bedrock = new BedrockClient(bedrockConfig);

        const mcpManager = new MultiServerMCPManager();
        
        // Register test servers
        const atlassianConfig = {
            name: 'atlassian',
            command: 'npx',
            args: ['-y', 'mcp-remote@0.1.13', 'https://mcp.atlassian.com/v1/sse'],
            enabled: true
        };
        mcpManager.registerServer(atlassianConfig);

        const bitbucketConfig = {
            name: 'bitbucket-server',
            command: './run_server.sh',
            args: [],
            cwd: '../MCPBitbucket',
            enabled: true
        };
        mcpManager.registerServer(bitbucketConfig);

        // Initialize Knowledge Hub
        const khConfig = {
            region: process.env['AWS_REGION'] || 'ap-south-1',
            knowledgeBaseId: process.env['BEDROCK_KB_ID'] || '',
            modelArn: process.env['BEDROCK_MODEL_ID'] || '',
            accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || undefined,
            secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || undefined
        };
        const knowledgeHub = new KnowledgeHubClient(khConfig);

        // Create smart agent with improved settings
        const smartAgent = new SmartAgent(bedrock, mcpManager, knowledgeHub);
        
        // Update settings for better data handling
        smartAgent.updateLoopPreventionSettings({
            maxSteps: 10, // Allow more steps for complex queries
            maxConsecutiveFailures: 3,
            maxSimilarSteps: 3, // Allow more similar steps for pagination
            minConfidenceForContinue: 0.6 // Lower threshold for continuation
        });

        // Connect to servers
        await mcpManager.connectToAllServers();
        console.log('✅ Connected to MCP servers');

        // Test queries
        const testQueries = [
            'Get all repositories',
            'Show me all Jira projects',
            'List all open tickets'
        ];

        for (const query of testQueries) {
            console.log(`\n🔍 Testing query: "${query}"`);
            console.log('=' .repeat(50));
            
            try {
                const startTime = Date.now();
                const response = await smartAgent.processQuery(query);
                const endTime = Date.now();
                
                console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
                console.log(`📝 Response length: ${response.length} characters`);
                console.log(`📄 Response preview: ${response.slice(0, 200)}...`);
                
                // Check if response mentions data completeness
                if (response.toLowerCase().includes('truncated') || 
                    response.toLowerCase().includes('incomplete') ||
                    response.toLowerCase().includes('pagination')) {
                    console.log('⚠️  Response indicates data may be incomplete');
                } else {
                    console.log('✅ Response appears complete');
                }
                
            } catch (error) {
                console.error(`❌ Error processing query: ${error}`);
            }
        }

        // Cleanup
        await mcpManager.disconnectFromAllServers();
        console.log('\n🧹 Cleanup complete');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSmartAgentImprovements(); 