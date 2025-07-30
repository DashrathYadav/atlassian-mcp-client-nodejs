import { AtlassianMCPClient } from '../client/atlassian-mcp-client.js';

export class MCPToolDispatcher {
  private mcpClient: AtlassianMCPClient;

  constructor(mcpClient: AtlassianMCPClient) {
    this.mcpClient = mcpClient;
  }

  async callTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    console.log(`🛠️  Calling tool: ${toolName} with parameters:`, parameters);
    
    try {
      switch (toolName) {
        case 'searchJiraIssuesUsingJql':
          return await this.mcpClient.searchJiraIssues(
            parameters['jql'] || 'status != Done',
            parameters['maxResults'] || 50
          );
          
        case 'getJiraIssue':
          return await this.mcpClient.getJiraIssue(
            parameters['issueIdOrKey'] || parameters['issueKey'] || parameters['key']
          );
          
        case 'getJiraProjects':
          return await this.mcpClient.getJiraProjects();
          
        case 'getJiraProject':
          // Note: The current client doesn't have getJiraProject, using getJiraProjects as fallback
          const projects = await this.mcpClient.getJiraProjects();
          const projectKey = parameters['projectIdOrKey'] || parameters['projectKey'] || parameters['key'];
          return projects.find(p => p.key === projectKey || p.id === projectKey) || null;
          
        case 'createJiraIssue':
          const fields = parameters['fields'] || parameters;
          return await this.mcpClient.createJiraIssue(
            fields['project'] || fields['projectKey'] || 'DEFAULT',
            fields['summary'] || 'New Issue',
            fields['description'],
            fields['issuetype'] ? fields['issuetype']['name'] : (fields['issueType'] || 'Task')
          );
          
        case 'updateJiraIssue':
          return await this.mcpClient.updateJiraIssue(
            parameters['issueIdOrKey'] || parameters['issueKey'] || parameters['key'],
            parameters['fields'] || parameters
          );
          
        case 'getJiraIssueTransitions':
          return await this.mcpClient.getJiraIssueTransitions(
            parameters['issueIdOrKey'] || parameters['issueKey'] || parameters['key']
          );
          
        case 'searchConfluenceContent':
          return await this.mcpClient.searchConfluenceContent(
            parameters['query'] || parameters['cql'] || '',
            parameters['maxResults'] || 20
          );
          
        case 'getConfluenceSpaces':
          return await this.mcpClient.getConfluenceSpaces();
          
        case 'getPagesInSpace':
          return await this.mcpClient.getPagesInSpace(
            parameters['spaceKey'] || parameters['space'],
            parameters['maxResults'] || 25
          );
          
        case 'createConfluencePage':
          return await this.mcpClient.createConfluencePage(
            parameters['spaceKey'] || parameters['space'],
            parameters['title'],
            parameters['content'] || parameters['body'] || ''
          );
          
        case 'getUserInfo':
          return await this.mcpClient.getUserInfo();
          
        case 'getAccessibleResources':
          return await this.mcpClient.getAccessibleResources();
          
        default:
          throw new Error(`Unknown tool: ${toolName}. Available tools: ${this.getAvailableTools().join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  getAvailableTools(): string[] {
    return [
      'searchJiraIssuesUsingJql',
      'getJiraIssue',
      'getJiraProjects', 
      'getJiraProject',
      'createJiraIssue',
      'updateJiraIssue',
      'getJiraIssueTransitions',
      'searchConfluenceContent',
      'getConfluenceSpaces',
      'getPagesInSpace',
      'createConfluencePage',
      'getUserInfo',
      'getAccessibleResources'
    ];
  }

  getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      'searchJiraIssuesUsingJql': 'Search Jira issues using JQL query',
      'getJiraIssue': 'Get detailed information about a specific Jira issue',
      'getJiraProjects': 'List all accessible Jira projects',
      'getJiraProject': 'Get detailed information about a specific project',
      'createJiraIssue': 'Create a new Jira issue',
      'updateJiraIssue': 'Update an existing Jira issue',
      'getJiraIssueTransitions': 'Get available transitions for a Jira issue',
      'searchConfluenceContent': 'Search Confluence content',
      'getConfluenceSpaces': 'List all accessible Confluence spaces',
      'getPagesInSpace': 'Get pages in a specific Confluence space',
      'createConfluencePage': 'Create a new Confluence page',
      'getUserInfo': 'Get current user information',
      'getAccessibleResources': 'Get accessible Atlassian resources'
    };
    
    return descriptions[toolName] || 'Unknown tool';
  }
}
