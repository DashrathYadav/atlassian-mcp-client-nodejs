#!/usr/bin/env tsx

/**
 * Fetch Real Data Demo
 * 
 * This demo connects to the Atlassian MCP server and fetches real data
 * from your Jira and Confluence instances.
 */

import { AtlassianMCPClient } from "../client/atlassian-mcp-client.js";

interface DemoResults {
  userInfo?: any;
  resources?: any[];
  jiraProjects?: any[];
  confluenceSpaces?: any[];
  recentJiraIssues?: any[];
  recentConfluencePages?: any[];
}

class RealDataDemo {
  private client: AtlassianMCPClient;
  private results: DemoResults = {};

  constructor() {
    this.client = new AtlassianMCPClient({
      debug: true
    });
  }

  async run(): Promise<void> {
    console.log("🚀 Starting Real Data Fetch Demo...\n");

    try {
      // Step 1: Connect to Atlassian MCP server
      await this.connectToServer();

      // Step 2: Get user information
      await this.fetchUserInfo();

      // Step 3: Get accessible resources
      await this.fetchAccessibleResources();

      // Step 4: Fetch Jira data
      await this.fetchJiraData();

      // Step 5: Fetch Confluence data
      await this.fetchConfluenceData();

      // Step 6: Display comprehensive summary
      this.displaySummary();

    } catch (error) {
      console.error("❌ Demo failed:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async connectToServer(): Promise<void> {
    console.log("📡 Connecting to Atlassian MCP server...");
    await this.client.connect();
    console.log("✅ Connected successfully!\n");
  }

  private async fetchUserInfo(): Promise<void> {
    console.log("👤 Fetching user information...");
    
    try {
      this.results.userInfo = await this.client.getUserInfo();
      
      if (this.results.userInfo) {
        console.log(`✅ User: ${this.results.userInfo.displayName || this.results.userInfo.name}`);
        console.log(`📧 Email: ${this.results.userInfo.emailAddress}`);
        console.log(`🆔 Account ID: ${this.results.userInfo.accountId}\n`);
      }
    } catch (error) {
      console.log("⚠️ Could not fetch user info:", error);
    }
  }

  private async fetchAccessibleResources(): Promise<void> {
    console.log("🏢 Fetching accessible Atlassian resources...");
    
    try {
      this.results.resources = await this.client.getAccessibleResources();
      
      if (this.results.resources && this.results.resources.length > 0) {
        console.log(`✅ Found ${this.results.resources.length} accessible resource(s):`);
        this.results.resources.forEach((resource, index) => {
          console.log(`  ${index + 1}. ${resource.name} (${resource.url})`);
        });
        console.log();
      }
    } catch (error) {
      console.log("⚠️ Could not fetch accessible resources:", error);
    }
  }

  private async fetchJiraData(): Promise<void> {
    console.log("🎯 Fetching Jira data...");
    
    try {
      // Get Jira projects
      this.results.jiraProjects = await this.client.getJiraProjects();
      
      if (this.results.jiraProjects && this.results.jiraProjects.length > 0) {
        console.log(`✅ Found ${this.results.jiraProjects.length} Jira project(s):`);
        this.results.jiraProjects.slice(0, 5).forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name} (${project.key})`);
        });
        
        if (this.results.jiraProjects.length > 5) {
          console.log(`  ... and ${this.results.jiraProjects.length - 5} more`);
        }
        console.log();

        // Fetch recent issues from the first project
        await this.fetchRecentJiraIssues();
      } else {
        console.log("⚠️ No Jira projects found or accessible\n");
      }
    } catch (error) {
      console.log("⚠️ Could not fetch Jira projects:", error);
    }
  }

  private async fetchRecentJiraIssues(): Promise<void> {
    if (!this.results.jiraProjects || this.results.jiraProjects.length === 0) {
      return;
    }

    console.log("🔍 Fetching recent Jira issues...");
    
    try {
      const firstProject = this.results.jiraProjects[0];
      const jql = `project = "${firstProject.key}" ORDER BY updated DESC`;
      
      this.results.recentJiraIssues = await this.client.searchJiraIssues(jql, 10);
      
      if (this.results.recentJiraIssues && this.results.recentJiraIssues.length > 0) {
        console.log(`✅ Found ${this.results.recentJiraIssues.length} recent issue(s) in ${firstProject.name}:`);
        
        this.results.recentJiraIssues.slice(0, 5).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.key}: ${issue.fields?.summary || 'No summary'}`);
          console.log(`     Status: ${issue.fields?.status?.name || 'Unknown'}`);
          console.log(`     Updated: ${issue.fields?.updated ? new Date(issue.fields.updated).toLocaleDateString() : 'Unknown'}`);
        });
        
        if (this.results.recentJiraIssues.length > 5) {
          console.log(`     ... and ${this.results.recentJiraIssues.length - 5} more issues`);
        }
        console.log();
      }
    } catch (error) {
      console.log("⚠️ Could not fetch recent Jira issues:", error);
    }
  }

  private async fetchConfluenceData(): Promise<void> {
    console.log("📚 Fetching Confluence data...");
    
    try {
      // Get Confluence spaces
      this.results.confluenceSpaces = await this.client.getConfluenceSpaces();
      
      if (this.results.confluenceSpaces && this.results.confluenceSpaces.length > 0) {
        console.log(`✅ Found ${this.results.confluenceSpaces.length} Confluence space(s):`);
        this.results.confluenceSpaces.slice(0, 5).forEach((space, index) => {
          console.log(`  ${index + 1}. ${space.name} (${space.key})`);
        });
        
        if (this.results.confluenceSpaces.length > 5) {
          console.log(`  ... and ${this.results.confluenceSpaces.length - 5} more`);
        }
        console.log();

        // Fetch recent pages from the first space
        await this.fetchRecentConfluencePages();
      } else {
        console.log("⚠️ No Confluence spaces found or accessible\n");
      }
    } catch (error) {
      console.log("⚠️ Could not fetch Confluence spaces:", error);
    }
  }

  private async fetchRecentConfluencePages(): Promise<void> {
    if (!this.results.confluenceSpaces || this.results.confluenceSpaces.length === 0) {
      return;
    }

    console.log("📄 Fetching recent Confluence pages...");
    
    try {
      const firstSpace = this.results.confluenceSpaces[0];
      
      this.results.recentConfluencePages = await this.client.getPagesInSpace(firstSpace.key, 10);
      
      if (this.results.recentConfluencePages && this.results.recentConfluencePages.length > 0) {
        console.log(`✅ Found ${this.results.recentConfluencePages.length} page(s) in ${firstSpace.name}:`);
        
        this.results.recentConfluencePages.slice(0, 5).forEach((page, index) => {
          console.log(`  ${index + 1}. ${page.title}`);
          console.log(`     Updated: ${page.version?.when ? new Date(page.version.when).toLocaleDateString() : 'Unknown'}`);
        });
        
        if (this.results.recentConfluencePages.length > 5) {
          console.log(`     ... and ${this.results.recentConfluencePages.length - 5} more pages`);
        }
        console.log();
      }
    } catch (error) {
      console.log("⚠️ Could not fetch recent Confluence pages:", error);
    }
  }

  private displaySummary(): void {
    console.log("📊 SUMMARY OF FETCHED DATA");
    console.log("=".repeat(50));
    
    // User Information
    if (this.results.userInfo) {
      console.log(`👤 User: ${this.results.userInfo.displayName || this.results.userInfo.name}`);
      console.log(`📧 Email: ${this.results.userInfo.emailAddress}`);
    }
    
    // Resources
    if (this.results.resources && this.results.resources.length > 0) {
      console.log(`🏢 Accessible Resources: ${this.results.resources.length}`);
      this.results.resources.forEach(resource => {
        console.log(`   • ${resource.name}`);
      });
    }
    
    // Jira Summary
    if (this.results.jiraProjects && this.results.jiraProjects.length > 0) {
      console.log(`🎯 Jira Projects: ${this.results.jiraProjects.length}`);
      if (this.results.recentJiraIssues && this.results.recentJiraIssues.length > 0) {
        console.log(`🔍 Recent Issues: ${this.results.recentJiraIssues.length}`);
      }
    }
    
    // Confluence Summary
    if (this.results.confluenceSpaces && this.results.confluenceSpaces.length > 0) {
      console.log(`📚 Confluence Spaces: ${this.results.confluenceSpaces.length}`);
      if (this.results.recentConfluencePages && this.results.recentConfluencePages.length > 0) {
        console.log(`📄 Recent Pages: ${this.results.recentConfluencePages.length}`);
      }
    }
    
    console.log("\n✅ Real data fetch completed successfully!");
    console.log("\n💡 Next steps:");
    console.log("  • Use this data to build your application");
    console.log("  • Implement specific search queries");
    console.log("  • Create/update issues and pages");
    console.log("  • Set up automated workflows");
  }

  private async cleanup(): Promise<void> {
    console.log("\n🧹 Cleaning up...");
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
  const demo = new RealDataDemo();
  await demo.run();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { RealDataDemo };
