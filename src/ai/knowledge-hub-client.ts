import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from '@aws-sdk/client-bedrock-agent-runtime';

export interface KnowledgeHubConfig {
    region: string;
    knowledgeBaseId: string;
    modelArn: string;
    accessKeyId?: string | undefined;
    secretAccessKey?: string | undefined;
    sessionToken?: string | undefined;
}

export interface KnowledgeHubResponse {
    result: string;
    citations?: any[];
    confidence?: number;
    error?: string;
}

export class KnowledgeHubClient {
    private client: BedrockAgentRuntimeClient;
    private config: KnowledgeHubConfig;

    constructor(config: KnowledgeHubConfig) {
        this.config = config;

        const clientConfig: any = {
            region: config.region
        };

        if (config.accessKeyId && config.secretAccessKey) {
            clientConfig.credentials = {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                sessionToken: config.sessionToken
            };
        }

        this.client = new BedrockAgentRuntimeClient(clientConfig);
    }

    /**
     * Query the Knowledge Hub with a specific question
     */
    async query(prompt: string): Promise<KnowledgeHubResponse> {
        if (!this.config.knowledgeBaseId || !this.config.modelArn) {
            throw new Error('Knowledge base ID (BEDROCK_KB_ID) or model ARN (BEDROCK_MODEL_ID) not configured');
        }

        try {
            const command = new RetrieveAndGenerateCommand({
                input: {
                    text: prompt,
                },
                retrieveAndGenerateConfiguration: {
                    type: 'KNOWLEDGE_BASE',
                    knowledgeBaseConfiguration: {
                        knowledgeBaseId: this.config.knowledgeBaseId,
                        modelArn: this.config.modelArn,
                    },
                },
            });

            const response = await this.client.send(command);

            return {
                result: response.output?.text || 'No response from Knowledge Hub',
                citations: response.citations || [],
                confidence: response.citations && response.citations.length > 0 ? 1 : 0.5 // Simple confidence scoring
            };
        } catch (error) {
            console.error('Knowledge Hub query error:', error);
            return {
                result: 'Sorry, I encountered an error while querying the Knowledge Hub.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Test the connection to the Knowledge Hub
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.query('Test connection - please respond with "Connection successful"');
            console.log('✅ Knowledge Hub connection successful:', response.result);
            return true;
        } catch (error) {
            console.error('❌ Knowledge Hub connection failed:', error);
            return false;
        }
    }

    /**
     * Get configuration info (for debugging)
     */
    getConfig(): Partial<KnowledgeHubConfig> {
        return {
            region: this.config.region,
            knowledgeBaseId: this.config.knowledgeBaseId,
            modelArn: this.config.modelArn
        };
    }
} 