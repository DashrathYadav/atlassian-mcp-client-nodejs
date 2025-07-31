#!/usr/bin/env node

import dotenv from 'dotenv';
import { SimpleAIAtlassianCLI } from './src/cli/ai-cli';

// Load environment variables
dotenv.config();

async function main() {
    try {
        console.log('🚀 Starting Simple AI Interactive CLI...');
        const cli = new SimpleAIAtlassianCLI();
        await cli.start();
    } catch (error) {
        console.error('❌ AI session failed:', error);
        process.exit(1);
    }
}

main(); 