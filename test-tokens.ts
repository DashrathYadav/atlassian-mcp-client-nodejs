#!/usr/bin/env node

/**
 * Simple test to verify OAuth tokens and Atlassian API access
 */

import { loadConfig } from './src/config/atlassian-config.js';
import { createConsoleLogger } from './src/utils/logger.js';
import { AtlassianOAuthProvider } from './src/client/auth/oauth-provider.js';

async function testTokens() {
  const logger = createConsoleLogger();
  
  console.log('🔐 Testing Atlassian OAuth Tokens');
  console.log('=================================\n');
  
  try {
    // Load config
    const config = loadConfig();
    console.log('✅ Configuration loaded');
    
    // Create auth provider
    const authProvider = new AtlassianOAuthProvider(config.atlassian, logger);
    console.log('✅ Auth provider created');
    
    // Check if we have tokens
    console.log('\n📋 Checking authentication status...');
    const isAuthenticated = authProvider.isAuthenticated();
    console.log(`   - Is Authenticated: ${isAuthenticated}`);
    
    if (!isAuthenticated) {
      console.log('\n🔑 Starting authentication...');
      await authProvider.authenticate();
      console.log('✅ Authentication completed');
    }
    
    // Get tokens
    const tokens = authProvider.getTokens();
    if (tokens) {
      console.log('\n🎫 Token Information:');
      console.log(`   - Access Token: ${tokens.access_token.substring(0, 20)}...`);
      console.log(`   - Token Type: ${tokens.token_type}`);
      console.log(`   - Expires In: ${tokens.expires_in} seconds`);
      if (tokens.refresh_token) {
        console.log(`   - Refresh Token: ${tokens.refresh_token.substring(0, 20)}...`);
      }
      console.log(`   - Scope: ${tokens.scope}`);
    }
    
    // Test a simple Atlassian API call
    console.log('\n🌐 Testing Atlassian API access...');
    const response = await fetch(`${config.atlassian.siteUrl}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Bearer ${tokens?.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      console.log('✅ Atlassian API access successful!');
      console.log(`   - User: ${user.displayName} (${user.emailAddress})`);
      console.log(`   - Account ID: ${user.accountId}`);
    } else {
      console.log(`❌ Atlassian API access failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   - Error: ${errorText}`);
    }
    
    // Test MCP server endpoint
    console.log('\n🔌 Testing MCP server endpoint...');
    const mcpResponse = await fetch(config.atlassian.mcpServerUrl, {
      headers: {
        'Authorization': `Bearer ${tokens?.access_token}`,
        'Accept': 'text/event-stream'
      }
    });
    
    console.log(`   - MCP Server Response: ${mcpResponse.status} ${mcpResponse.statusText}`);
    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.log(`   - Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testTokens().catch(console.error);
}

export { testTokens };
