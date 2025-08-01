#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🌲 Starting PineLens UI Test...');
console.log('================================');

// Start the test UI server
const testServer = spawn('tsx', ['src/ui/test-ui.ts'], {
    stdio: 'inherit',
    cwd: process.cwd()
});

console.log('✅ PineLens UI test server started');
console.log('🌐 Open your browser to: http://localhost:3000');
console.log('🔍 Try searching for: "Show me all open tickets" or "What are our API specifications?"');
console.log('');
console.log('Press Ctrl+C to stop the server');

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping PineLens UI test server...');
    testServer.kill('SIGINT');
    process.exit(0);
});

testServer.on('close', (code) => {
    console.log(`\n✅ PineLens UI test server stopped with code ${code}`);
}); 