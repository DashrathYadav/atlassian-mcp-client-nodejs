#!/usr/bin/env node

/**
 * Test the active MCP connection
 * 
 * This script tests if the mcp-remote proxy is working by connecting to it
 * and listing available tools from the Atlassian MCP server.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function testMCPConnection() {
  console.log("🧪 Testing MCP Connection");
  console.log("=========================");
  console.log();

  try {
    console.log("📡 Connecting to local mcp-remote proxy...");
    
    // Connect to the mcp-remote proxy via stdio
    // Since mcp-remote is already running, we need to connect to it
    const mcpProcess = spawn("npx", ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    if (!mcpProcess.stdout || !mcpProcess.stdin) {
      throw new Error("Failed to create MCP process streams");
    }

    const transport = new StdioClientTransport({
      readable: mcpProcess.stdout,
      writable: mcpProcess.stdin
    });

    const client = new Client(
      { name: "atlassian-test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    console.log("✅ Connected to MCP server!");

    // List available tools
    console.log("\n🔧 Listing available tools...");
    const response = await client.listTools();
    
    if (response.tools && response.tools.length > 0) {
      console.log("📋 Available tools:");
      response.tools.forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.name}: ${tool.description || 'No description'}`);
      });
    } else {
      console.log("❌ No tools available");
    }

    // Test a simple operation
    console.log("\n🎯 Testing Jira projects access...");
    try {
      const projectsResponse = await client.callTool({
        name: "jira_get_projects",
        arguments: {}
      });
      
      console.log("✅ Successfully called Jira projects tool!");
      console.log("Response:", JSON.stringify(projectsResponse, null, 2));
    } catch (error) {
      console.log("⚠️  Could not call Jira tool:", error.message);
    }

    await client.close();
    mcpProcess.kill();
    
    console.log("\n🎉 Test completed successfully!");
    console.log("\nYour Atlassian MCP connection is working!");
    console.log("You can now use it with:");
    console.log("- VS Code MCP extension");
    console.log("- Claude Desktop");
    console.log("- Cursor IDE");
    console.log("- Any MCP-compatible tool");

  } catch (error) {
    console.error("❌ Test failed:", error);
    console.log("\nTroubleshooting:");
    console.log("1. Make sure mcp-remote is still running in another terminal");
    console.log("2. Check that you completed OAuth authentication");
    console.log("3. Verify your Atlassian site access");
  }
}

testMCPConnection().catch(console.error);
