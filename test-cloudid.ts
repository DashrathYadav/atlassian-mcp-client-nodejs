import { MultiServerMCPManager } from './src/client/multi-server-mcp-manager.js';

async function testCloudIdInjection() {
    console.log('🧪 Testing CloudId automatic injection...');

    const manager = new MultiServerMCPManager();

    // Register Atlassian server
    manager.registerServer({
        name: 'atlassian',
        command: 'npx',
        args: ['-y', 'mcp-remote@0.1.13', 'https://mcp.atlassian.com/v1/sse'],
        enabled: true
    });

    try {
        // Connect to Atlassian server
        await manager.connectToServer('atlassian');

        // Get all tools
        const allTools = manager.getAllTools();
        const atlassianTools = manager.getToolsFromServer('atlassian');

        console.log(`✅ Connected to Atlassian server`);
        console.log(`📦 Total tools: ${allTools.length}`);
        console.log(`🛠️  Atlassian tools: ${atlassianTools.length}`);

        // Test cloudId injection by calling a tool without cloudId
        if (atlassianTools.length > 0) {
            const testTool = atlassianTools[0];
            console.log(`\n🧪 Testing cloudId injection for tool: ${testTool.name}`);

            try {
                // This should automatically add cloudId
                const result = await manager.callTool(testTool.name, {});
                console.log(`✅ Tool call successful with automatic cloudId injection`);
            } catch (error) {
                console.log(`❌ Tool call failed: ${error.message}`);
                // This is expected since we're using a placeholder cloudId
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await manager.disconnectFromAllServers();
        console.log('🧹 Cleanup complete');
    }
}

testCloudIdInjection(); 