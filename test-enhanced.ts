#!/usr/bin/env node

import { EnhancedInteractiveCLI } from './src/cli/enhanced-interactive-cli';

async function main() {
    try {
        const cli = new EnhancedInteractiveCLI();
        await cli.start();
    } catch (error) {
        console.error('Enhanced CLI failed:', error);
        process.exit(1);
    }
}

main().catch(console.error); 