#!/usr/bin/env node

/**
 * OAuth Debugging - Check what's wrong with the tokens
 */

import { loadConfig } from './src/config/atlassian-config.js';
import { createConsoleLogger } from './src/utils/logger.js';
import { AtlassianOAuthProvider } from './src/client/auth/oauth-provider.js';

async function debugOAuth() {
  const logger = createConsoleLogger();
  
  console.log('🔍 OAuth Debug Session');
  console.log('=====================\n');
  
  try {
    const config = loadConfig();
    const authProvider = new AtlassianOAuthProvider(config.atlassian, logger);
    
    // Authenticate
    await authProvider.authenticate();
    const tokens = authProvider.getTokens();
    
    if (!tokens) {
      throw new Error('No tokens received');
    }
    
    console.log('📋 Token Details:');
    console.log(`   - Access Token Length: ${tokens.access_token.length} chars`);
    console.log(`   - Token Type: ${tokens.token_type}`);
    console.log(`   - Scope: ${tokens.scope}`);
    console.log(`   - Expires In: ${tokens.expires_in} seconds`);
    
    // Test the token with different API endpoints
    const testEndpoints = [
      '/rest/api/3/myself',
      '/rest/api/3/serverInfo', 
      '/rest/api/3/permissions',
      '/rest/api/3/project'
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`\n🌐 Testing: ${endpoint}`);
      try {
        const response = await fetch(`${config.atlassian.siteUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json'
          }
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 401) {
          const errorText = await response.text();
          console.log(`   Error: ${errorText.substring(0, 100)}...`);
        } else if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Success! Response keys: ${Object.keys(data).join(', ')}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Check token format
    console.log('\n🔐 Token Analysis:');
    try {
      const tokenParts = tokens.access_token.split('.');
      console.log(`   - Token parts: ${tokenParts.length} (JWT should have 3)`);
      if (tokenParts.length === 3) {
        console.log('   - Format: Looks like JWT');
      } else {
        console.log('   - Format: Not JWT format');
      }
    } catch (error) {
      console.log('   - Analysis failed');
    }
    
    console.log('\n💡 Solution:');
    console.log('   The OAuth app needs to be configured differently in the Atlassian Developer Console.');
    console.log('   Your current Client ID might not have the right permissions for your Atlassian instance.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugOAuth().catch(console.error);
}

export { debugOAuth };
