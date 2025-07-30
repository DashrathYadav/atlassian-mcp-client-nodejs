#!/usr/bin/env bash

# Real Data Fetch Demo Runner
# This script runs the demo to fetch real data from Atlassian MCP server

echo "🚀 Starting Real Data Fetch Demo..."
echo "This will connect to your Atlassian instance and fetch real data."
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available. Please install npm/Node.js properly."
    exit 1
fi

echo "✅ Node.js and npx are available"
echo ""

# Run the demo
echo "🎯 Executing real data fetch demo..."
echo "Note: Browser will open for OAuth authentication if needed."
echo ""

npx tsx src/demo/fetch-real-data.ts

echo ""
echo "✅ Demo completed!"
