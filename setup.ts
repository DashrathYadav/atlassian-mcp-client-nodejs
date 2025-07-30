#!/usr/bin/env node

/**
 * Setup script for Atlassian MCP Client
 * Validates environment, checks dependencies, and runs initial tests
 */

import { loadConfig, validateConfig } from './src/config/atlassian-config.js';
import { createConsoleLogger } from './src/utils/logger.js';
import { AtlassianMCPClient } from './src/client/atlassian-client.js';

async function runSetup() {
  const logger = createConsoleLogger();
  
  console.log('🚀 Atlassian MCP Client Setup');
  console.log('===============================\n');
  
  // Step 1: Validate configuration
  console.log('📋 Step 1: Validating configuration...');
  try {
    const config = loadConfig();
    validateConfig(config);
    console.log('✅ Configuration is valid');
    
    console.log('\nConfiguration Summary:');
    console.log(`- Site URL: ${config.atlassian.siteUrl}`);
    console.log(`- Client ID: ${config.atlassian.clientId.substring(0, 8)}...`);
    console.log(`- MCP Server: ${config.atlassian.mcpServerUrl}`);
    console.log(`- Scopes: ${config.atlassian.scopes.join(', ')}`);
  } catch (error) {
    console.error('❌ Configuration validation failed:');
    console.error(error.message);
    console.log('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  // Step 2: Test client initialization
  console.log('\n🔧 Step 2: Testing client initialization...');
  try {
    const config = loadConfig();
    const client = new AtlassianMCPClient({
      config,
      logger
    });
    console.log('✅ Client initialized successfully');
  } catch (error) {
    console.error('❌ Client initialization failed:', error.message);
    process.exit(1);
  }
  
  // Step 3: Test connection (optional - requires auth)
  console.log('\n🌐 Step 3: Testing connection...');
  console.log('ℹ️  Skipping connection test (requires OAuth flow)');
  console.log('   Run "npm run demo" to test with authentication');
  
  // Step 4: Display next steps
  console.log('\n🎉 Setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Run "npm run demo" to start the interactive CLI');
  console.log('2. Try "npm run demo -- --type jira" for Jira demos');
  console.log('3. Try "npm run demo -- --type confluence" for Confluence demos');
  console.log('4. Check the README.md for detailed usage instructions');
  
  console.log('\n📚 Quick Commands:');
  console.log('- npm run build           # Build the project');
  console.log('- npm run dev             # Development mode');
  console.log('- npm run demo            # Interactive demo');
  console.log('- npm test               # Run tests');
  
  console.log('\n✨ Happy coding with Atlassian MCP!');
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { runSetup };
