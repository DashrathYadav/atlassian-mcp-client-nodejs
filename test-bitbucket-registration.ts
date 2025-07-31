import { SimpleAIAtlassianCLI } from './src/cli/ai-cli.js';

async function testBitbucketRegistration() {
    console.log('🧪 Testing Bitbucket Server Registration...');

    const cli = new SimpleAIAtlassianCLI();

    // Access the private mcpManager to check registered servers
    const mcpManager = (cli as any).mcpManager;

    // Check if servers are registered (this will trigger registerServers)
    console.log('📋 Checking registered servers...');

    // We can't directly access the private serverConfigs, but we can test by connecting
    try {
        await mcpManager.connectToAllServers();
        const connectedServers = mcpManager.getConnectedServers();
        console.log(`✅ Connected servers: ${connectedServers.join(', ')}`);

        const allTools = mcpManager.getAllTools();
        console.log(`📦 Total tools: ${allTools.length}`);

        // Check for Bitbucket tools
        const bitbucketTools = allTools.filter(tool => tool.serverName === 'bitbucket-server');
        console.log(`🛠️  Bitbucket tools: ${bitbucketTools.length}`);

        if (bitbucketTools.length > 0) {
            console.log('✅ Bitbucket server is working!');
            bitbucketTools.forEach(tool => {
                console.log(`  • ${tool.name}`);
            });
        } else {
            console.log('❌ No Bitbucket tools found');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mcpManager.disconnectFromAllServers();
        console.log('🧹 Cleanup complete');
    }
}

testBitbucketRegistration(); 