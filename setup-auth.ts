#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupAuth() {
    console.log('🔐 Atlassian MCP Client Authentication Setup');
    console.log('============================================\n');

    console.log('This script will help you create a .env file with the required authentication variables.\n');

    console.log('📋 Prerequisites:');
    console.log('1. You need to create an OAuth app in the Atlassian Developer Console');
    console.log('2. You need a Google Gemini API key');
    console.log('3. See AUTHENTICATION_SETUP.md for detailed instructions\n');

    const continueSetup = await question('Do you have your OAuth credentials ready? (y/n): ');
    if (continueSetup.toLowerCase() !== 'y') {
        console.log('\n❌ Please complete the prerequisites first. See AUTHENTICATION_SETUP.md for instructions.');
        rl.close();
        return;
    }

    console.log('\n📝 Let\'s configure your .env file:\n');

    // Get Atlassian site URL
    const siteUrl = await question('Enter your Atlassian site URL (e.g., your-site.atlassian.net): ');
    if (!siteUrl.includes('atlassian.net')) {
        console.log('❌ Invalid Atlassian site URL. It should end with .atlassian.net');
        rl.close();
        return;
    }

    // Get OAuth credentials
    const clientId = await question('Enter your OAuth Client ID: ');
    const clientSecret = await question('Enter your OAuth Client Secret: ');

    // Get Gemini API key
    const geminiKey = await question('Enter your Google Gemini API key: ');

    // Optional settings
    const port = await question('Enter callback port (default: 3000): ') || '3000';
    const logLevel = await question('Enter log level (debug/info/warn/error, default: info): ') || 'info';

    // Create .env content
    const envContent = `# Atlassian OAuth Configuration
ATLASSIAN_SITE_URL=${siteUrl}
ATLASSIAN_CLIENT_ID=${clientId}
ATLASSIAN_CLIENT_SECRET=${clientSecret}
ATLASSIAN_REDIRECT_URI=http://localhost:${port}/callback

# Google Gemini AI (for AI features)
GEMINI_API_KEY=${geminiKey}

# Optional Configuration
PORT=${port}
LOG_LEVEL=${logLevel}
DEBUG_MODE=false
`;

    // Write .env file
    const envPath = path.join(process.cwd(), '.env');

    try {
        fs.writeFileSync(envPath, envContent);
        console.log('\n✅ .env file created successfully!');
        console.log(`📁 Location: ${envPath}`);

        console.log('\n🔍 Next steps:');
        console.log('1. Test authentication: npm run auth:test');
        console.log('2. Run the AI client: npm run ai');
        console.log('3. See AUTHENTICATION_SETUP.md for troubleshooting');

    } catch (error) {
        console.error('\n❌ Failed to create .env file:', error.message);
    }

    rl.close();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupAuth().catch(console.error);
}

export { setupAuth }; 