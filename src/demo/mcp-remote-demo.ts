#!/usr/bin/env node

/**
 * Atlassian MCP Server Demo
 * 
 * This demo connects to the Atlassian Remote MCP Server using the official mcp-remote tool.
 * It follows the exact pattern from the Atlassian documentation.
 */

import { spawn } from "child_process";
import readline from "readline";

const SERVER_URL = "https://mcp.atlassian.com/v1/sse";
const MCP_REMOTE_VERSION = "0.1.13";

console.log("🚀 Atlassian MCP Server Demo");
console.log("============================");
console.log();
console.log("This demo will:");
console.log("1. Start the mcp-remote proxy");
console.log("2. Open your browser for OAuth authentication");
console.log("3. Once authenticated, you can interact with your Atlassian instance");
console.log();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function startMCPRemote(): Promise<void> {
  console.log(`📡 Starting mcp-remote proxy...`);
  console.log(`Command: npx -y mcp-remote@${MCP_REMOTE_VERSION} ${SERVER_URL}`);
  console.log();
  
  const mcpRemoteProcess = spawn("npx", [
    "-y",
    `mcp-remote@${MCP_REMOTE_VERSION}`,
    SERVER_URL
  ], {
    stdio: "inherit" // This will show all output directly
  });

  mcpRemoteProcess.on("error", (error) => {
    console.error("❌ Error starting mcp-remote:", error.message);
    process.exit(1);
  });

  mcpRemoteProcess.on("exit", (code, signal) => {
    if (code !== 0) {
      console.error(`❌ mcp-remote exited with code ${code}, signal ${signal}`);
    } else {
      console.log("✅ mcp-remote session ended");
    }
    process.exit(code || 0);
  });

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Stopping mcp-remote...");
    mcpRemoteProcess.kill("SIGTERM");
    rl.close();
  });

  // Wait a bit for the process to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("\n🌐 A browser window should open for OAuth authentication.");
  console.log("Please complete the authentication process in your browser.");
  console.log("\nOnce authenticated, you can use this MCP connection with:");
  console.log("- VS Code with MCP extension");
  console.log("- Claude Desktop");
  console.log("- Cursor IDE");
  console.log("- Any other MCP-compatible client");
  console.log("\nPress Ctrl+C to stop the proxy when done.");
}

async function main(): Promise<void> {
  try {
    console.log("🔧 Prerequisites check:");
    console.log("✓ Node.js v18+ (you're running this script)");
    console.log("✓ Modern browser for OAuth");
    console.log("✓ Atlassian Cloud site with Jira/Confluence");
    console.log();

    const proceed = await askQuestion("Ready to start? (y/N): ");
    
    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      console.log("👋 Goodbye!");
      rl.close();
      return;
    }

    console.log();
    await startMCPRemote();

  } catch (error) {
    console.error("❌ Error:", error);
    rl.close();
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
