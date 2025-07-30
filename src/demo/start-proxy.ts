#!/usr/bin/env node

/**
 * Direct MCP Remote Starter
 * 
 * Starts the mcp-remote proxy directly without prompts
 */

import { spawn } from "child_process";

console.log("🚀 Starting Atlassian MCP Remote Proxy");
console.log("=====================================");
console.log();
console.log("📡 Connecting to: https://mcp.atlassian.com/v1/sse");
console.log("🔧 Using mcp-remote@0.1.13");
console.log();

const mcpProcess = spawn("npx", [
  "-y",
  "mcp-remote@0.1.13", 
  "https://mcp.atlassian.com/v1/sse"
], {
  stdio: "inherit"
});

mcpProcess.on("error", (error) => {
  console.error("❌ Error starting mcp-remote:", error.message);
  process.exit(1);
});

mcpProcess.on("exit", (code, signal) => {
  if (code !== 0) {
    console.error(`❌ mcp-remote exited with code ${code}, signal ${signal}`);
  } else {
    console.log("✅ mcp-remote session ended normally");
  }
  process.exit(code || 0);
});

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\n🛑 Stopping mcp-remote...");
  mcpProcess.kill("SIGTERM");
});

console.log("🌐 Browser will open for OAuth authentication...");
console.log("📋 After authentication, the proxy will be ready for MCP clients");
console.log("🔄 Press Ctrl+C to stop when done");
console.log();
