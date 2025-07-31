#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing Database Server Path');
console.log('================================\n');

// Current directory
const currentDir = process.cwd();
console.log('Current Directory:', currentDir);

// Test relative path
const relativePath = '../../../MCP-projects/MCP-DbServer';
const resolvedPath = path.resolve(currentDir, relativePath);
console.log('Relative Path:', relativePath);
console.log('Resolved Path:', resolvedPath);
console.log('Path Exists:', fs.existsSync(resolvedPath) ? '✅ Yes' : '❌ No');

// Check for required files
if (fs.existsSync(resolvedPath)) {
    const csprojPath = path.join(resolvedPath, 'MsDbServer', 'MsDbServer.csproj');
    const programPath = path.join(resolvedPath, 'MsDbServer', 'Program.cs');
    
    console.log('MsDbServer/MsDbServer.csproj exists:', fs.existsSync(csprojPath) ? '✅ Yes' : '❌ No');
    console.log('MsDbServer/Program.cs exists:', fs.existsSync(programPath) ? '✅ Yes' : '❌ No');
    
    if (fs.existsSync(csprojPath)) {
        console.log('\n✅ Path is correct! Your database server should be accessible.');
        console.log('   The command will be: dotnet run --project MsDbServer');
        console.log('   From directory:', resolvedPath);
    } else {
        console.log('\n❌ MsDbServer.csproj not found. Check the path.');
    }
} else {
    console.log('\n❌ Path does not exist. Please check your folder structure.');
}

console.log('\n📝 Next steps:');
console.log('1. Create .env file with: DB_SERVER_PATH=../../../MCP-projects/MCP-DbServer');
console.log('2. Run: npm run test:multi-server'); 