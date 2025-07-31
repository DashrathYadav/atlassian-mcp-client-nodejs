#!/usr/bin/env node

import dotenv from 'dotenv';
import { EnhancedInteractiveCLI } from './src/cli/enhanced-interactive-cli';

// Load environment variables
dotenv.config();

async function main() {
    try {
        console.log('🚀 Starting Enhanced AI Interactive CLI...');
        const cli = new EnhancedInteractiveCLI();
        await cli.start();
    } catch (error) {
        console.error('❌ Enhanced AI session failed:', error);
        process.exit(1);
    }
}

main(); 