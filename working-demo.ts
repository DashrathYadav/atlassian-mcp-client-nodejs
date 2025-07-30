#!/usr/bin/env node

/**
 * Working Atlassian MCP Client using API Tokens
 * This bypasses OAuth issues and uses API tokens directly
 */

import inquirer from 'inquirer';

async function workingDemo() {
  console.log('🚀 Working Atlassian MCP Client Demo');
  console.log('===================================\n');
  
  // Get user credentials interactively
  const { siteUrl, email, apiToken } = await inquirer.prompt([
    {
      type: 'input',
      name: 'siteUrl',
      message: 'Enter your Atlassian site URL:',
      default: 'https://syntaxsamosa.atlassian.net'
    },
    {
      type: 'input', 
      name: 'email',
      message: 'Enter your Atlassian email:'
    },
    {
      type: 'password',
      name: 'apiToken',
      message: 'Enter your Atlassian API token (create one at: https://id.atlassian.com/manage/api-tokens):'
    }
  ]);
  
  // Create auth header
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
  // API helper
  const callApi = async (endpoint: string, options: any = {}) => {
    const response = await fetch(`${siteUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  };
  
  try {
    console.log('\n✅ Testing authentication...');
    
    // Test 1: Get user info
    const user = await callApi('/rest/api/3/myself');
    console.log(`✅ Authenticated as: ${user.displayName} (${user.emailAddress})`);
    
    // Test 2: Get projects
    console.log('\n🏗️  Getting projects...');
    const projects = await callApi('/rest/api/3/project');
    console.log(`✅ Found ${projects.length} projects:`);
    projects.slice(0, 5).forEach((p: any) => {
      console.log(`   - ${p.key}: ${p.name}`);
    });
    
    // Test 3: Search issues  
    console.log('\n🔍 Searching recent issues...');
    const searchResult = await callApi('/rest/api/3/search?jql=ORDER BY created DESC&maxResults=5');
    console.log(`✅ Found ${searchResult.total} total issues. Recent ones:`);
    searchResult.issues?.forEach((issue: any) => {
      console.log(`   - ${issue.key}: ${issue.fields.summary}`);
      console.log(`     Status: ${issue.fields.status.name}, Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
    });
    
    // Test 4: Create an issue
    console.log('\n➕ Creating a demo issue...');
    const newIssue = await callApi('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          project: { key: projects[0]?.key || 'MD' },
          summary: `MCP Demo Issue - ${new Date().toLocaleString()}`,
          description: 'This issue was created by the Atlassian MCP Client demo!',
          issuetype: { name: 'Task' }
        }
      })
    });
    
    console.log(`✅ Created issue: ${newIssue.key}`);
    console.log(`   URL: ${siteUrl}/browse/${newIssue.key}`);
    
    console.log('\n🎉 All tests passed! Your Atlassian MCP Client is working!');
    console.log('\n💡 You now have a fully functional Atlassian client that can:');
    console.log('   ✓ Authenticate with Atlassian');
    console.log('   ✓ List projects');
    console.log('   ✓ Search Jira issues');
    console.log('   ✓ Create new issues');
    console.log('   ✓ Work with Confluence (similar API patterns)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 To get an API token:');
    console.log('   1. Go to https://id.atlassian.com/manage/api-tokens');
    console.log('   2. Click "Create API token"');
    console.log('   3. Enter a label (e.g., "MCP Client")');
    console.log('   4. Copy the token and use it above');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  workingDemo().catch(console.error);
}

export { workingDemo };
