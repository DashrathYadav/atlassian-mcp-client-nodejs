#!/usr/bin/env node

import dotenv from 'dotenv';
import { SimpleEnhancedCLI } from './src/cli/simple-enhanced-cli';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting Simple Enhanced AI...');
    const cli = new SimpleEnhancedCLI();
    await cli.start();
  } catch (error) {
    console.error('❌ Simple Enhanced AI failed:', error);
    process.exit(1);
  }
}

main(); 