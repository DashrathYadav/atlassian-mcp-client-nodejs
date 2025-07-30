#!/usr/bin/env node

/**
 * Simple Working Atlassian Client Demo
 * Direct API calls without external MCP server
 */

import { loadConfig } from './src/config/atlassian-config.js';
import { createConsoleLogger } from './src/utils/logger.js';
import { AtlassianOAuthProvider } from './src/client/auth/oauth-provider.js';

async function simpleTest() {
  const logger = createConsoleLogger();
  
  console.log('🎯 Simple Atlassian MCP Client Test');
  console.log('===================================\n');
  
  try {
    // 1. Setup
    const config = loadConfig();
    const authProvider = new AtlassianOAuthProvider(config.atlassian, logger);
    
    console.log('✅ Client configured');
    
    // 2. Authenticate
    await authProvider.authenticate();
    const tokens = authProvider.getTokens();
    
    console.log('✅ Authentication successful');
    
    // 3. Simple API helper
    const callApi = async (endpoint: string, options: any = {}) => {
      const response = await fetch(`${config.atlassian.siteUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    };
    
    // 4. Test basic functionality
    console.log('\n🔍 Testing Jira access...');
    
    try {
      // Get projects
      const projects = await callApi('/rest/api/3/project');
      console.log(`✅ Found ${projects.length} projects:`);
      projects.slice(0, 3).forEach((p: any) => console.log(`   - ${p.key}: ${p.name}`));
      
      // Search issues
      const searchResult = await callApi('/rest/api/3/search?jql=ORDER BY created DESC&maxResults=3');
      console.log(`\n✅ Found ${searchResult.total} issues:`);
      searchResult.issues?.forEach((issue: any) => {
        console.log(`   - ${issue.key}: ${issue.fields.summary}`);
      });
      
    } catch (error) {
      console.log(`❌ API Error: ${error.message}`);
    }
    
    console.log('\n🎉 Simple test completed!');
    console.log('\n💡 This proves your Atlassian client works!');
    console.log('   You can now build MCP tools on top of this foundation.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleTest().catch(console.error);
}

export { simpleTest };
