#!/usr/bin/env node

/**
 * Simple test to check MCP connection status
 */

import AtlassianMCPClient from '../client/atlassian-mcp-client.js';

async function testConnection() {
  console.log("🧪 Testing Atlassian MCP Client Connection");
  console.log("==========================================");
  console.log();

  const client = new AtlassianMCPClient({
    debug: true
  });

  try {
    console.log("📡 Attempting to connect to Atlassian MCP server...");
    
    // Add event listeners
    client.on('connected', () => {
      console.log("✅ Client connected successfully!");
    });

    client.on('disconnected', () => {
      console.log("📴 Client disconnected");
    });

    client.on('error', (error) => {
      console.error("❌ Client error:", error.message);
    });

    // Try to connect
    await client.connect();
    
    console.log("🔧 Testing available tools...");
    const tools = await client.listTools();
    console.log(`📋 Found ${tools.length} tools:`);
    tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
    });

    console.log("\n🎯 Testing Jira projects...");
    const projects = await client.getJiraProjects();
    console.log(`📊 Found ${projects.length} Jira projects`);

    await client.disconnect();
    console.log("\n🎉 Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n💡 This might mean:");
    console.log("1. The mcp-remote proxy is not running");
    console.log("2. Authentication failed");
    console.log("3. Network connectivity issues");
    
    await client.disconnect();
  }
}

testConnection().catch(console.error);
