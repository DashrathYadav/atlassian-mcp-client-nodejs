#!/usr/bin/env tsx

/**
 * Fetch Jira Tickets Demo
 * 
 * This demo connects to the Atlassian MCP server and fetches real Jira tickets
 * from your Atlassian instance.
 */

import { AtlassianMCPClient } from "../client/atlassian-mcp-client.js";

class JiraTicketFetcher {
  private client: AtlassianMCPClient;

  constructor() {
    this.client = new AtlassianMCPClient({
      debug: true
    });
  }

  async run(): Promise<void> {
    console.log("🎯 JIRA TICKET FETCHER");
    console.log("=".repeat(40));
    console.log();

    try {
      // Step 1: Connect to Atlassian MCP server
      await this.connectToAtlassian();

      // Step 2: Get user info and accessible resources
      await this.showUserContext();

      // Step 3: Get Jira projects
      await this.showJiraProjects();

      // Step 4: Fetch recent tickets
      await this.fetchRecentTickets();

      // Step 5: Search for specific tickets
      await this.searchTickets();

      // Step 6: Get ticket details
      await this.getTicketDetails();

    } catch (error) {
      console.error("❌ Failed to fetch Jira tickets:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async connectToAtlassian(): Promise<void> {
    console.log("📡 Connecting to Atlassian MCP server...");
    await this.client.connect();
    console.log("✅ Connected successfully!");
    console.log();
  }

  private async showUserContext(): Promise<void> {
    console.log("👤 Getting user information...");
    
    try {
      const userInfo = await this.client.getUserInfo();
      
      if (userInfo && userInfo.displayName) {
        console.log(`✅ Logged in as: ${userInfo.displayName}`);
        console.log(`📧 Email: ${userInfo.emailAddress}`);
        console.log(`🆔 Account ID: ${userInfo.accountId}`);
      } else {
        console.log("⚠️ Could not retrieve user information");
      }
    } catch (error) {
      console.log("⚠️ Error getting user info:", error);
    }

    console.log();

    // Get accessible resources
    console.log("🏢 Getting accessible Atlassian resources...");
    
    try {
      const resources = await this.client.getAccessibleResources();
      
      if (resources && Array.isArray(resources) && resources.length > 0) {
        console.log(`✅ Found ${resources.length} accessible resource(s):`);
        resources.forEach((resource, index) => {
          console.log(`  ${index + 1}. ${resource.name} (${resource.url})`);
        });
      } else {
        console.log("⚠️ No accessible resources found");
      }
    } catch (error) {
      console.log("⚠️ Error getting resources:", error);
    }

    console.log();
  }

  private async showJiraProjects(): Promise<void> {
    console.log("📋 Getting Jira projects...");
    
    try {
      const projects = await this.client.getJiraProjects();
      
      if (projects && projects.length > 0) {
        console.log(`✅ Found ${projects.length} Jira project(s):`);
        projects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name} (${project.key})`);
          if (project.description) {
            console.log(`     Description: ${project.description}`);
          }
        });
      } else {
        console.log("⚠️ No Jira projects found or accessible");
      }
    } catch (error) {
      console.log("⚠️ Error getting Jira projects:", error);
    }

    console.log();
  }

  private async fetchRecentTickets(): Promise<void> {
    console.log("🎫 Fetching recent Jira tickets...");
    
    try {
      // Get recent tickets across all projects
      const jql = "ORDER BY updated DESC";
      const tickets = await this.client.searchJiraIssues(jql, 10);
      
      if (tickets && tickets.length > 0) {
        console.log(`✅ Found ${tickets.length} recent ticket(s):`);
        console.log();
        
        tickets.forEach((ticket, index) => {
          this.displayTicketSummary(ticket, index + 1);
        });
      } else {
        console.log("⚠️ No recent tickets found");
      }
    } catch (error) {
      console.log("⚠️ Error fetching recent tickets:", error);
    }

    console.log();
  }

  private async searchTickets(): Promise<void> {
    console.log("🔍 Searching for specific tickets...");
    
    // Search examples
    const searchQueries = [
      { name: "Open tickets", jql: "status != Done ORDER BY created DESC" },
      { name: "High priority tickets", jql: "priority = High ORDER BY updated DESC" },
      { name: "Recent bugs", jql: "type = Bug AND created >= -30d ORDER BY created DESC" }
    ];

    for (const query of searchQueries) {
      try {
        console.log(`\n🔎 ${query.name}:`);
        const tickets = await this.client.searchJiraIssues(query.jql, 5);
        
        if (tickets && tickets.length > 0) {
          console.log(`   ✅ Found ${tickets.length} ticket(s)`);
          tickets.forEach((ticket, index) => {
            console.log(`   ${index + 1}. ${ticket.key}: ${(ticket as any).fields?.summary || 'No summary'}`);
            console.log(`      Status: ${(ticket as any).fields?.status?.name || 'Unknown'}`);
            console.log(`      Priority: ${(ticket as any).fields?.priority?.name || 'Unknown'}`);
          });
        } else {
          console.log(`   ⚠️ No tickets found for: ${query.name}`);
        }
      } catch (error) {
        console.log(`   ❌ Error searching ${query.name}:`, error);
      }
    }

    console.log();
  }

  private async getTicketDetails(): Promise<void> {
    console.log("📝 Getting detailed ticket information...");
    
    try {
      // First, get a ticket key from recent tickets
      const recentTickets = await this.client.searchJiraIssues("ORDER BY updated DESC", 1);
      
      if (recentTickets && recentTickets.length > 0) {
        const ticketKey = recentTickets[0]?.key;
        if (ticketKey) {
          console.log(`🎫 Getting details for ticket: ${ticketKey}`);
          
          // Use the getJiraIssue method
          const ticketDetails = await this.client.getJiraIssue(ticketKey);
          
          if (ticketDetails) {
            this.displayTicketDetails(ticketDetails);
          } else {
            console.log("⚠️ Could not get ticket details");
          }
        }
      } else {
        console.log("⚠️ No tickets available to get details for");
      }
    } catch (error) {
      console.log("⚠️ Error getting ticket details:", error);
    }

    console.log();
  }

  private displayTicketSummary(ticket: any, index: number): void {
    console.log(`${index}. 🎫 ${ticket.key}: ${(ticket as any).fields?.summary || 'No summary'}`);
    console.log(`   📊 Status: ${(ticket as any).fields?.status?.name || 'Unknown'}`);
    console.log(`   🚀 Priority: ${(ticket as any).fields?.priority?.name || 'Unknown'}`);
    console.log(`   👤 Assignee: ${(ticket as any).fields?.assignee?.displayName || 'Unassigned'}`);
    console.log(`   📅 Updated: ${(ticket as any).fields?.updated ? new Date((ticket as any).fields.updated).toLocaleDateString() : 'Unknown'}`);
    console.log(`   🏷️  Type: ${(ticket as any).fields?.issuetype?.name || 'Unknown'}`);
    
    if ((ticket as any).fields?.project) {
      console.log(`   📋 Project: ${(ticket as any).fields.project.name} (${(ticket as any).fields.project.key})`);
    }
    
    console.log();
  }

  private displayTicketDetails(ticket: any): void {
    console.log("=".repeat(50));
    console.log(`🎫 TICKET DETAILS: ${ticket.key}`);
    console.log("=".repeat(50));
    
    console.log(`📝 Summary: ${ticket.fields?.summary || 'No summary'}`);
    console.log(`📋 Project: ${ticket.fields?.project?.name || 'Unknown'} (${ticket.fields?.project?.key || ''})`);
    console.log(`🏷️  Type: ${ticket.fields?.issuetype?.name || 'Unknown'}`);
    console.log(`📊 Status: ${ticket.fields?.status?.name || 'Unknown'}`);
    console.log(`🚀 Priority: ${ticket.fields?.priority?.name || 'Unknown'}`);
    console.log(`👤 Assignee: ${ticket.fields?.assignee?.displayName || 'Unassigned'}`);
    console.log(`👨‍💻 Reporter: ${ticket.fields?.reporter?.displayName || 'Unknown'}`);
    
    if (ticket.fields?.created) {
      console.log(`📅 Created: ${new Date(ticket.fields.created).toLocaleDateString()}`);
    }
    
    if (ticket.fields?.updated) {
      console.log(`🔄 Updated: ${new Date(ticket.fields.updated).toLocaleDateString()}`);
    }
    
    if (ticket.fields?.description) {
      console.log(`📖 Description:`);
      console.log(`   ${ticket.fields.description.slice(0, 200)}${ticket.fields.description.length > 200 ? '...' : ''}`);
    }
    
    if (ticket.fields?.components && ticket.fields.components.length > 0) {
      console.log(`🔧 Components: ${ticket.fields.components.map((c: any) => c.name).join(', ')}`);
    }
    
    if (ticket.fields?.labels && ticket.fields.labels.length > 0) {
      console.log(`🏷️  Labels: ${ticket.fields.labels.join(', ')}`);
    }
    
    console.log("=".repeat(50));
  }

  private async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up...");
    await this.client.disconnect();
    console.log("✅ Disconnected from Atlassian MCP server");
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️ Interrupted by user');
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the demo
async function main() {
  const fetcher = new JiraTicketFetcher();
  await fetcher.run();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Jira ticket fetch failed:', error);
    process.exit(1);
  });
}

export { JiraTicketFetcher };
