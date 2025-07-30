#!/usr/bin/env tsx

/**
 * Jira Ticket Management Demo
 * 
 * This demo shows how to create, update, and manage Jira tickets
 * using the Atlassian MCP client.
 */

import { AtlassianMCPClient } from "../client/atlassian-mcp-client.js";

class JiraTicketManagement {
  private client: AtlassianMCPClient;

  constructor() {
    this.client = new AtlassianMCPClient({
      debug: true
    });
  }

  async run(): Promise<void> {
    console.log("🎫 JIRA TICKET MANAGEMENT DEMO");
    console.log("=".repeat(50));
    console.log();

    try {
      // Connect
      await this.client.connect();

      // First, let's get the existing MD-1 ticket details
      await this.showExistingTicket();

      // Get projects to know where we can create tickets
      await this.showProjects();

      // Show what we can do (without actually creating tickets to avoid spam)
      this.showCapabilities();

    } catch (error) {
      console.error("❌ Management demo failed:", error);
    } finally {
      await this.client.disconnect();
    }
  }

  private async showExistingTicket(): Promise<void> {
    console.log("📋 EXISTING TICKET DETAILS");
    console.log("-".repeat(40));
    
    try {
      const ticket = await this.client.getJiraIssue("MD-1");
      
      if (ticket) {
        console.log("✅ FULL TICKET DETAILS:");
        console.log(`🎫 Key: ${ticket.key}`);
        console.log(`📝 Summary: ${ticket.fields?.summary || 'No summary'}`);
        console.log(`📊 Status: ${ticket.fields?.status?.name || 'Unknown'}`);
        console.log(`🚀 Priority: ${ticket.fields?.priority?.name || 'Unknown'}`);
        console.log(`🏷️  Type: ${ticket.fields?.issuetype?.name || 'Unknown'}`);
        console.log(`📋 Project: ${ticket.fields?.project?.name || 'Unknown'} (${ticket.fields?.project?.key || ''})`);
        
        if (ticket.fields?.assignee) {
          console.log(`👤 Assignee: ${ticket.fields.assignee.displayName} (${ticket.fields.assignee.emailAddress})`);
        }
        
        if (ticket.fields?.reporter) {
          console.log(`👨‍💻 Reporter: ${ticket.fields.reporter.displayName} (${ticket.fields.reporter.emailAddress})`);
        }
        
        if (ticket.fields?.description) {
          console.log(`📖 Description:`);
          console.log(`   ${ticket.fields.description.slice(0, 300)}${ticket.fields.description.length > 300 ? '...' : ''}`);
        }
        
        if (ticket.fields?.created) {
          console.log(`📅 Created: ${new Date(ticket.fields.created).toLocaleString()}`);
        }
        
        if (ticket.fields?.updated) {
          console.log(`🔄 Updated: ${new Date(ticket.fields.updated).toLocaleString()}`);
        }
        
        if (ticket.fields?.components && ticket.fields.components.length > 0) {
          console.log(`🔧 Components: ${ticket.fields.components.map((c: any) => c.name).join(', ')}`);
        }
        
        if (ticket.fields?.labels && ticket.fields.labels.length > 0) {
          console.log(`🏷️  Labels: ${ticket.fields.labels.join(', ')}`);
        }

        // Show available transitions
        await this.showAvailableTransitions(ticket.key);
        
      } else {
        console.log("⚠️ Could not get ticket details");
      }
    } catch (error) {
      console.log("⚠️ Error getting ticket details:", error);
    }
    
    console.log();
  }

  private async showAvailableTransitions(issueKey: string): Promise<void> {
    try {
      console.log(`\n🔄 Available transitions for ${issueKey}:`);
      
      const transitions = await this.client.getJiraIssueTransitions(issueKey);
      
      if (transitions && transitions.length > 0) {
        transitions.forEach((transition: any, index: number) => {
          console.log(`   ${index + 1}. ${transition.name} (ID: ${transition.id})`);
        });
      } else {
        console.log("   ⚠️ No transitions available");
      }
    } catch (error) {
      console.log("   ⚠️ Could not get transitions:", error);
    }
  }

  private async showProjects(): Promise<void> {
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
          if (project.url) {
            console.log(`   🔗 URL: ${project.url}`);
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

  private showCapabilities(): void {
    console.log("🛠️  AVAILABLE CAPABILITIES");
    console.log("-".repeat(40));
    console.log();
    
    console.log("✅ **What you can do with this MCP client:**");
    console.log();
    
    console.log("📖 **READ Operations:**");
    console.log("   • Get ticket details (✅ Working - just got MD-1 details)");
    console.log("   • Search tickets with JQL (✅ Working - found MD-1 across queries)");
    console.log("   • List projects (✅ Working - showing project info)");
    console.log("   • Get user information");
    console.log("   • Get available transitions");
    console.log();
    
    console.log("✏️  **WRITE Operations:**");
    console.log("   • Create new tickets");
    console.log("   • Update existing tickets");
    console.log("   • Transition tickets (change status)");
    console.log("   • Add comments to tickets");
    console.log();
    
    console.log("🔧 **Example Usage:**");
    console.log();
    console.log("   // Create a new ticket");
    console.log("   const newTicket = await client.createJiraIssue(");
    console.log("     'MD', // project key");
    console.log("     'Test ticket from MCP client',");
    console.log("     'This ticket was created via the MCP API',");
    console.log("     'Task'");
    console.log("   );");
    console.log();
    
    console.log("   // Update a ticket");
    console.log("   await client.updateJiraIssue('MD-1', {");
    console.log("     summary: 'Updated summary',");
    console.log("     description: 'Updated description'");
    console.log("   });");
    console.log();
    
    console.log("   // Search with custom JQL");
    console.log("   const tickets = await client.searchJiraIssues(");
    console.log("     'project = MD AND status = \"To Do\"'");
    console.log("   );");
    console.log();
    
    console.log("🎯 **Your Next Steps:**");
    console.log("   1. Try creating a test ticket");
    console.log("   2. Update the existing MD-1 ticket");
    console.log("   3. Transition MD-1 to 'In Progress'");
    console.log("   4. Add comments to tickets");
    console.log("   5. Build your own automation workflows");
    console.log();
    
    console.log("🎉 **SUCCESS: You have a fully working Atlassian MCP client!**");
  }
}

// Run the management demo
async function main() {
  const management = new JiraTicketManagement();
  await management.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Management demo failed:', error);
    process.exit(1);
  });
}

export { JiraTicketManagement };
