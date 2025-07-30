#!/usr/bin/env tsx

/**
 * Enhanced Jira Query Demo
 * 
 * This demo uses more specific JQL queries to find all available tickets
 * in your Jira instance.
 */

import { AtlassianMCPClient } from "../client/atlassian-mcp-client.js";

class EnhancedJiraQuery {
  private client: AtlassianMCPClient;

  constructor() {
    this.client = new AtlassianMCPClient({
      debug: true
    });
  }

  async run(): Promise<void> {
    console.log("🔍 ENHANCED JIRA QUERY DEMO");
    console.log("=".repeat(50));
    console.log();

    try {
      // Connect
      await this.client.connect();

      // Get detailed ticket info for MD-1
      await this.getTicketDetails("MD-1");

      // Try various JQL queries to find more tickets
      await this.comprehensiveSearch();

      // Get project details
      await this.getProjectInfo();

    } catch (error) {
      console.error("❌ Query failed:", error);
    } finally {
      await this.client.disconnect();
    }
  }

  private async getTicketDetails(ticketKey: string): Promise<void> {
    console.log(`📋 Getting full details for ticket: ${ticketKey}`);
    
    try {
      const ticket = await this.client.getJiraIssue(ticketKey);
      
      if (ticket) {
        console.log("✅ TICKET DETAILS:");
        console.log(`🎫 Key: ${ticket.key}`);
        console.log(`📝 Summary: ${ticket.fields?.summary || 'No summary'}`);
        console.log(`📊 Status: ${ticket.fields?.status?.name || 'Unknown'}`);
        console.log(`🚀 Priority: ${ticket.fields?.priority?.name || 'Unknown'}`);
        console.log(`👤 Assignee: ${ticket.fields?.assignee?.displayName || 'Unassigned'}`);
        console.log(`👨‍💻 Reporter: ${ticket.fields?.reporter?.displayName || 'Unknown'}`);
        console.log(`🏷️  Type: ${ticket.fields?.issuetype?.name || 'Unknown'}`);
        console.log(`📋 Project: ${ticket.fields?.project?.name || 'Unknown'} (${ticket.fields?.project?.key || ''})`);
        
        if (ticket.fields?.description) {
          console.log(`📖 Description: ${ticket.fields.description.slice(0, 200)}...`);
        }
        
        if (ticket.fields?.created) {
          console.log(`📅 Created: ${new Date(ticket.fields.created).toLocaleDateString()}`);
        }
        
        if (ticket.fields?.updated) {
          console.log(`🔄 Updated: ${new Date(ticket.fields.updated).toLocaleDateString()}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not get details for ${ticketKey}:`, error);
    }
    
    console.log();
  }

  private async comprehensiveSearch(): Promise<void> {
    console.log("🔍 COMPREHENSIVE TICKET SEARCH");
    console.log("-".repeat(40));

    const queries = [
      { name: "All tickets", jql: "ORDER BY created DESC" },
      { name: "All tickets (by key)", jql: "ORDER BY key ASC" },
      { name: "Last 30 days", jql: "created >= -30d ORDER BY created DESC" },
      { name: "Last 90 days", jql: "created >= -90d ORDER BY created DESC" },
      { name: "All open", jql: "resolution = Unresolved ORDER BY priority DESC" },
      { name: "All To Do", jql: "status = 'To Do' ORDER BY priority DESC" },
      { name: "All priorities", jql: "priority IS NOT EMPTY ORDER BY priority DESC" },
      { name: "With assignee", jql: "assignee IS NOT EMPTY ORDER BY updated DESC" },
      { name: "Without assignee", jql: "assignee IS EMPTY ORDER BY created DESC" },
      { name: "All issue types", jql: "issuetype IS NOT EMPTY ORDER BY issuetype ASC" }
    ];

    for (const query of queries) {
      try {
        console.log(`\n🔎 ${query.name}:`);
        const tickets = await this.client.searchJiraIssues(query.jql, 10);
        
        if (tickets && tickets.length > 0) {
          console.log(`   ✅ Found ${tickets.length} ticket(s):`);
          tickets.forEach((ticket, index) => {
            console.log(`   ${index + 1}. ${ticket.key}: ${(ticket as any).fields?.summary || 'No summary'}`);
            console.log(`      Status: ${(ticket as any).fields?.status?.name || 'Unknown'}`);
            console.log(`      Type: ${(ticket as any).fields?.issuetype?.name || 'Unknown'}`);
            console.log(`      Priority: ${(ticket as any).fields?.priority?.name || 'Unknown'}`);
          });
        } else {
          console.log(`   ⚠️ No tickets found`);
        }
      } catch (error) {
        console.log(`   ❌ Query failed: ${error}`);
      }
    }

    console.log();
  }

  private async getProjectInfo(): Promise<void> {
    console.log("📋 PROJECT INFORMATION");
    console.log("-".repeat(30));

    try {
      const projects = await this.client.getJiraProjects();
      
      if (projects && projects.length > 0) {
        console.log(`✅ Found ${projects.length} project(s):`);
        projects.forEach((project, index) => {
          console.log(`\n${index + 1}. ${project.name} (${project.key})`);
          if (project.description) {
            console.log(`   📖 Description: ${project.description}`);
          }
          if (project.projectTypeKey) {
            console.log(`   🏷️  Type: ${project.projectTypeKey}`);
          }
          if (project.lead) {
            console.log(`   👤 Lead: ${project.lead.displayName}`);
          }
        });
      } else {
        console.log("⚠️ No projects found");
      }
    } catch (error) {
      console.log("❌ Could not get project info:", error);
    }

    console.log();
  }
}

// Run the enhanced query
async function main() {
  const query = new EnhancedJiraQuery();
  await query.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Enhanced query failed:', error);
    process.exit(1);
  });
}

export { EnhancedJiraQuery };
