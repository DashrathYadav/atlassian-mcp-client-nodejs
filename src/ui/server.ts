import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { BedrockClient, BedrockConfig } from '../ai/bedrock-client.js';
import { KnowledgeHubClient, KnowledgeHubConfig } from '../ai/knowledge-hub-client.js';
import { MultiServerMCPManager } from '../client/multi-server-mcp-manager.js';
import { EnhancedToolDispatcher } from '../routing/enhanced-tool-dispatcher.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
let bedrock: BedrockClient;
let knowledgeHub: KnowledgeHubClient;
let mcpManager: MultiServerMCPManager;
let dispatcher: EnhancedToolDispatcher;

async function initializeServices() {
  try {
    console.log('🚀 Initializing AI services...');

    // Initialize Bedrock
    const bedrockConfig: BedrockConfig = {
      region: process.env['AWS_REGION'] || 'ap-south-1',
      accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
      secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']
    };
    bedrock = new BedrockClient(bedrockConfig);

    // Initialize MCP Manager
    mcpManager = new MultiServerMCPManager();

    // Register servers
    const atlassianConfig = {
      name: 'atlassian',
      command: 'npx',
      args: ['-y', 'mcp-remote@0.1.13', 'https://mcp.atlassian.com/v1/sse'],
      enabled: true
    };
    mcpManager.registerServer(atlassianConfig);

    const bitbucketConfig = {
      name: 'bitbucket-server',
      command: './run_server.sh',
      args: [],
      cwd: '../MCPBitbucket',
      enabled: true
    };
    mcpManager.registerServer(bitbucketConfig);

    const databaseConfig = {
      name: 'database-server-mssql',
      command: 'dotnet',
      args: ['run', '--project', 'MsDbServer'],
      cwd: process.env['DB_SERVER_PATH'] || '../../../MCP-projects/MCP-DbServer',
      env: {
        'McpServer__Transport__Stdio__Enabled': 'true',
        'McpServer__Transport__Http__Enabled': 'false',
        'McpServer__Database__Provider': 'mssql',
        'McpServer__Database__ConnectionString': process.env['DB_CONNECTION_STRING'] || 'Server=localhost,1433;Database=app_db;User Id=sa;Password=Temp@123;TrustServerCertificate=true;',
        'McpServer__Logging__LogLevel': 'Information'
      },
      enabled: true
    };
    mcpManager.registerServer(databaseConfig);

    // Initialize Knowledge Hub if configured
    if (process.env['BEDROCK_KB_ID'] && process.env['BEDROCK_MODEL_ID']) {
      const khConfig: KnowledgeHubConfig = {
        region: process.env['AWS_REGION'] || 'ap-south-1',
        knowledgeBaseId: process.env['BEDROCK_KB_ID'],
        modelArn: process.env['BEDROCK_MODEL_ID'],
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || undefined,
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || undefined
      };
      knowledgeHub = new KnowledgeHubClient(khConfig);
    }

    // Initialize Enhanced Tool Dispatcher (Normal AI)
    dispatcher = new EnhancedToolDispatcher(mcpManager, knowledgeHub, bedrock);

    // Connect to MCP servers
    await mcpManager.connectToAllServers();
    console.log('✅ MCP servers connected');

    // Test connections
    const bedrockConnected = await bedrock.testConnection();
    if (!bedrockConnected) {
      throw new Error('Failed to connect to AWS Bedrock');
    }
    console.log('✅ Bedrock connected');

    if (knowledgeHub) {
      const khConnected = await knowledgeHub.testConnection();
      if (khConnected) {
        console.log('✅ Knowledge Hub connected');
      } else {
        console.log('⚠️  Knowledge Hub connection failed');
      }
    }

    console.log('🎉 All services initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    return false;
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/query', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid prompt. Please provide a valid string.'
      });
    }

    console.log(`🤖 Processing query: "${prompt}"`);

    const response = await dispatcher.processQuery(prompt);

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      error: 'Failed to process query. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const status = {
      bedrock: false,
      knowledgeHub: false,
      mcpServers: [] as string[],
      timestamp: new Date().toISOString()
    };

    // Test Bedrock
    try {
      status.bedrock = await bedrock.testConnection();
    } catch (error) {
      console.error('Bedrock test failed:', error);
    }

    // Test Knowledge Hub
    if (knowledgeHub) {
      try {
        status.knowledgeHub = await knowledgeHub.testConnection();
      } catch (error) {
        console.error('Knowledge Hub test failed:', error);
      }
    }

    // Get MCP server status
    status.mcpServers = mcpManager.getConnectedServers();

    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
async function startServer() {
  const servicesReady = await initializeServices();

  if (!servicesReady) {
    console.error('❌ Failed to initialize services. Exiting...');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🌐 UI Server running at http://localhost:${PORT}`);
    console.log(`📱 Open your browser and navigate to http://localhost:${PORT}`);
  });
}

startServer().catch(console.error); 