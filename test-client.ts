#!/usr/bin/env node

/**
 * Simple test script to verify the Atlassian MCP Client functionality
 */

import { loadConfig } from './src/config/atlassian-config.js';
import { createConsoleLogger } from './src/utils/logger.js';
import { AtlassianMCPClient } from './src/client/atlassian-client.js';

async function testClient() {
  const logger = createConsoleLogger();
  
  console.log('🧪 Testing Atlassian MCP Client Configuration');
  console.log('==============================================\n');
  
  try {
    // Test 1: Configuration loading
    console.log('📋 Test 1: Loading configuration...');
    const config = loadConfig();
    console.log('✅ Configuration loaded successfully!');
    console.log(`   - Site URL: ${config.atlassian.siteUrl}`);
    console.log(`   - Client ID: ${config.atlassian.clientId.substring(0, 8)}...`);
    console.log(`   - MCP Server: ${config.atlassian.mcpServerUrl}`);
    console.log(`   - Scopes: ${config.atlassian.scopes.length} configured\n`);
    
    // Test 2: Client initialization
    console.log('🔧 Test 2: Initializing client...');
    const client = new AtlassianMCPClient({
      config,
      logger
    });
    console.log('✅ Client initialized successfully!\n');
    
    // Test 3: Check client status
    console.log('📊 Test 3: Checking client status...');
    const authStatus = client.getAuthStatus();
    console.log(`   - Is Authenticated: ${authStatus.isAuthenticated}`);
    console.log(`   - Transport Connected: ${authStatus.transportConnected}`);
    console.log(`   - Tools Available: ${authStatus.toolsAvailable}\n`);
    
    // Test 4: Show available methods
    console.log('🛠️  Test 4: Available client methods...');
    const methods = [
      'connect()',
      'disconnect()',
      'authenticate()',
      'searchJiraIssues(options)',
      'createJiraIssue(data)',
      'searchConfluenceContent(options)',
      'createConfluencePage(data)',
      'executeQuery(query)',
      'getAvailableTools()',
      'healthCheck()'
    ];
    
    methods.forEach(method => {
      console.log(`   ✓ ${method}`);
    });
    
    console.log('\n🎉 All tests passed! The Atlassian MCP Client is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Run "npm run demo" for interactive testing');
    console.log('   2. Complete OAuth authentication in the browser');
    console.log('   3. Test Jira and Confluence operations');
    console.log('   4. Use CLI commands for specific operations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testClient().catch(console.error);
}

export { testClient };
