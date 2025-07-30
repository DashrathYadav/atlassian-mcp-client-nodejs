import { QueryIntent } from '../ai/gemini-client.js';

export interface ToolMapping {
  intent: Partial<QueryIntent>;
  mcpTool: string;
  parameterMapping: Record<string, string | ((params: any) => any)>;
  validation?: (params: any) => boolean;
}

export interface ToolCall {
  toolName: string;
  parameters: Record<string, any>;
  confidence: number;
}

export class MCPToolRouter {
  private toolMappings: ToolMapping[] = [
    // Search queries
    {
      intent: { action: 'search', entity: 'tickets' },
      mcpTool: 'searchJiraIssuesUsingJql',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        jql: (params: any) => this.buildJQLFromFilters(params.filters || [])
      }
    },
    {
      intent: { action: 'search', entity: 'issues' },
      mcpTool: 'searchJiraIssuesUsingJql',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        jql: (params: any) => this.buildJQLFromFilters(params.filters || [])
      }
    },
    
    // Get specific ticket
    {
      intent: { action: 'get', entity: 'tickets' },
      mcpTool: 'getJiraIssue',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        issueIdOrKey: (params: any) => params.ticketId || params.key || params.issueKey
      }
    },
    {
      intent: { action: 'get', entity: 'issues' },
      mcpTool: 'getJiraIssue',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        issueIdOrKey: (params: any) => params.ticketId || params.key || params.issueKey
      }
    },
    
    // List projects
    {
      intent: { action: 'list', entity: 'projects' },
      mcpTool: 'getJiraProjects',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff'
      }
    },
    
    // Get specific project
    {
      intent: { action: 'get', entity: 'projects' },
      mcpTool: 'getJiraProject',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        projectIdOrKey: (params: any) => params.projectId || params.key || params.projectKey
      }
    },
    
    // Create ticket
    {
      intent: { action: 'create', entity: 'tickets' },
      mcpTool: 'createJiraIssue',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        fields: (params: any) => this.buildCreateIssueFields(params)
      }
    },
    {
      intent: { action: 'create', entity: 'issues' },
      mcpTool: 'createJiraIssue',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        fields: (params: any) => this.buildCreateIssueFields(params)
      }
    },
    
    // Update ticket
    {
      intent: { action: 'update', entity: 'tickets' },
      mcpTool: 'updateJiraIssue',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        issueIdOrKey: (params: any) => params.ticketId || params.key || params.issueKey,
        fields: (params: any) => this.buildUpdateIssueFields(params)
      }
    },
    
    // Get transitions
    {
      intent: { action: 'transition', entity: 'tickets' },
      mcpTool: 'getJiraIssueTransitions',
      parameterMapping: {
        cloudId: '65fa3ca6-c0c5-4d04-93d2-88127a2297ff',
        issueIdOrKey: (params: any) => params.ticketId || params.key || params.issueKey
      }
    }
  ];

  routeToTool(intent: QueryIntent, aiParameters: Record<string, any> = {}): ToolCall {
    // Find the best matching tool mapping
    const mapping = this.findBestMapping(intent);
    
    if (!mapping) {
      throw new Error(`No tool mapping found for intent: ${intent.action} ${intent.entity}`);
    }

    // Build parameters using the mapping
    const parameters = this.buildParameters(mapping, intent, aiParameters);
    
    return {
      toolName: mapping.mcpTool,
      parameters,
      confidence: intent.confidence
    };
  }

  private findBestMapping(intent: QueryIntent): ToolMapping | undefined {
    // Find exact match first
    const exactMatch = this.toolMappings.find(mapping => 
      mapping.intent.action === intent.action && 
      mapping.intent.entity === intent.entity
    );
    
    if (exactMatch) return exactMatch;
    
    // Find partial match
    return this.toolMappings.find(mapping =>
      mapping.intent.action === intent.action ||
      mapping.intent.entity === intent.entity
    );
  }

  private buildParameters(
    mapping: ToolMapping, 
    intent: QueryIntent, 
    aiParameters: Record<string, any>
  ): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Merge intent parameters with AI parameters
    const allParams = { ...intent.parameters, ...aiParameters, filters: intent.filters };
    
    // Apply parameter mapping
    for (const [paramName, paramMapping] of Object.entries(mapping.parameterMapping)) {
      if (typeof paramMapping === 'function') {
        parameters[paramName] = paramMapping(allParams);
      } else {
        parameters[paramName] = paramMapping;
      }
    }
    
    return parameters;
  }

  private buildJQLFromFilters(filters: any[]): string {
    if (!filters || filters.length === 0) {
      return 'status != Done'; // Default to open tickets
    }
    
    const jqlParts = filters.map(filter => {
      const { field, operator, value } = filter;
      
      switch (operator) {
        case 'equals':
          return `${field} = "${value}"`;
        case 'contains':
          return `${field} ~ "${value}"`;
        case 'in':
          const values = Array.isArray(value) ? value : [value];
          return `${field} in (${values.map(v => `"${v}"`).join(', ')})`;
        case 'greater_than':
          return `${field} > "${value}"`;
        case 'less_than':
          return `${field} < "${value}"`;
        default:
          return `${field} = "${value}"`;
      }
    });
    
    return jqlParts.join(' AND ');
  }

  private buildCreateIssueFields(params: any): Record<string, any> {
    const fields: Record<string, any> = {
      summary: params.summary || params.title || 'New Issue',
      issuetype: { name: params.type || params.issueType || 'Task' }
    };
    
    if (params.description) {
      fields['description'] = params.description;
    }
    
    if (params.priority) {
      fields['priority'] = { name: params.priority };
    }
    
    if (params.assignee) {
      fields['assignee'] = { name: params.assignee };
    }
    
    if (params.project) {
      fields['project'] = { key: params.project };
    }
    
    return fields;
  }

  private buildUpdateIssueFields(params: any): Record<string, any> {
    const fields: Record<string, any> = {};
    
    if (params.summary || params.title) {
      fields['summary'] = params.summary || params.title;
    }
    
    if (params.description) {
      fields['description'] = params.description;
    }
    
    if (params.priority) {
      fields['priority'] = { name: params.priority };
    }
    
    if (params.assignee) {
      fields['assignee'] = { name: params.assignee };
    }
    
    if (params.status) {
      // Note: Status updates usually require transitions, not direct field updates
      console.warn('Status updates should use transitions. Use transition action instead.');
    }
    
    return fields;
  }

  // Helper method to get available tools
  getAvailableTools(): string[] {
    return Array.from(new Set(this.toolMappings.map(m => m.mcpTool)));
  }

  // Helper method to get tool mappings for debugging
  getToolMappings(): ToolMapping[] {
    return this.toolMappings;
  }
}
