#!/usr/bin/env node

/**
 * Direct Atlassian REST API Demo (without MCP server)
 * This bypasses the MCP server and uses Atlassian's REST APIs directly
 */

import { loadConfig } from './src/config/atlassian-config.js';
import { createConsoleLogger } from './src/utils/logger.js';
import { AtlassianOAuthProvider } from './src/client/auth/oauth-provider.js';

async function directApiDemo() {
  const logger = createConsoleLogger();
  
  console.log('🚀 Direct Atlassian API Demo');
  console.log('============================\n');
  
  try {
    // Load configuration
    const config = loadConfig();
    logger.info('Configuration loaded successfully');
    
    // Create auth provider  
    const authProvider = new AtlassianOAuthProvider(config.atlassian, logger);
    
    // Authenticate
    logger.info('Starting authentication...');
    await authProvider.authenticate();
    logger.info('Authentication completed');
    
    const tokens = authProvider.getTokens();
    if (!tokens) {
      throw new Error('No tokens available');
    }
    
    // Test 1: Get current user info
    console.log('\n--- Test 1: Get User Information ---');
    try {
      const userResponse = await fetch(`${config.atlassian.siteUrl}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const user = await userResponse.json();
        console.log('✅ User Info Retrieved:');
        console.log(`   - Name: ${user.displayName}`);
        console.log(`   - Email: ${user.emailAddress}`);
        console.log(`   - Account ID: ${user.accountId}`);
      } else {
        console.log(`❌ User info failed: ${userResponse.status}`);
      }
    } catch (error) {
      console.log('❌ User info error:', error.message);
    }
    
    // Test 2: Search Jira issues
    console.log('\n--- Test 2: Search Jira Issues ---');
    try {
      const jqlQuery = 'ORDER BY created DESC';
      const jiraResponse = await fetch(
        `${config.atlassian.siteUrl}/rest/api/3/search?jql=${encodeURIComponent(jqlQuery)}&maxResults=5`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (jiraResponse.ok) {
        const jiraData = await jiraResponse.json();
        console.log('✅ Jira Issues Retrieved:');
        console.log(`   - Total: ${jiraData.total} issues found`);
        jiraData.issues?.slice(0, 3).forEach((issue: any, index: number) => {
          console.log(`   ${index + 1}. ${issue.key}: ${issue.fields.summary}`);
        });
      } else {
        console.log(`❌ Jira search failed: ${jiraResponse.status}`);
        const errorText = await jiraResponse.text();
        console.log(`   Error: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log('❌ Jira search error:', error.message);
    }
    
    // Test 3: Get Jira projects
    console.log('\n--- Test 3: Get Jira Projects ---');
    try {
      const projectsResponse = await fetch(`${config.atlassian.siteUrl}/rest/api/3/project`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      });
      
      if (projectsResponse.ok) {
        const projects = await projectsResponse.json();
        console.log('✅ Projects Retrieved:');
        projects.slice(0, 5).forEach((project: any) => {
          console.log(`   - ${project.key}: ${project.name}`);
        });
      } else {
        console.log(`❌ Projects failed: ${projectsResponse.status}`);
      }
    } catch (error) {
      console.log('❌ Projects error:', error.message);
    }
    
    // Test 4: Create a Jira issue (if we have a valid project)
    console.log('\n--- Test 4: Create Demo Jira Issue ---');
    try {
      const createIssuePayload = {
        fields: {
          project: { key: 'MD' }, // Using your MD project
          summary: `Demo Issue - ${new Date().toISOString()}`,
          description: 'This is a demo issue created by the Atlassian MCP Client',
          issuetype: { name: 'Task' }
        }
      };
      
      const createResponse = await fetch(`${config.atlassian.siteUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createIssuePayload)
      });
      
      if (createResponse.ok) {
        const newIssue = await createResponse.json();
        console.log('✅ Issue Created:');
        console.log(`   - Key: ${newIssue.key}`);
        console.log(`   - URL: ${config.atlassian.siteUrl}/browse/${newIssue.key}`);
      } else {
        console.log(`❌ Issue creation failed: ${createResponse.status}`);
        const errorText = await createResponse.text();
        console.log(`   Error: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log('❌ Issue creation error:', error.message);
    }
    
    console.log('\n🎉 Direct API Demo Completed!');
    console.log('\n💡 This shows that your OAuth setup works with direct API calls.');
    console.log('   The MCP server issue might be due to different authentication requirements.');
    
  } catch (error) {
    logger.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  directApiDemo().catch(console.error);
}

export { directApiDemo };
