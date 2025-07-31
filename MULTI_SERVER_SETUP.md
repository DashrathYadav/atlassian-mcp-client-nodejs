# Multi-Server MCP Setup Guide

This guide explains how to configure the multi-server MCP client to work with both Atlassian and your database MCP server.

## Environment Variables

Create a `.env` file in the root of this project with the following variables:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1

# Database Server Configuration
# Set this to the path where your MsDbServer project is located
# Relative path example: ../../../MCP-projects/MCP-DbServer
# Absolute path example: /Users/dashrathyadav/Desktop/dash/MCP-projects/MCP-DbServer
DB_SERVER_PATH=../../../MCP-projects/MCP-DbServer

# Database Connection String
DB_CONNECTION_STRING=Server=localhost,1433;Database=app_db;User Id=sa;Password=Temp@123;TrustServerCertificate=true;
```

## Directory Structure

Your projects should be structured like this:

```
/Users/dashrathyadav/Desktop/dash/
├── Dashrath_Code/mcp/atlassian-mcp-client/  # Current project
│   ├── src/
│   ├── package.json
│   └── .env
└── MCP-projects/MCP-DbServer/     # Your database MCP server
    ├── MsDbServer.csproj
    ├── Program.cs
    └── ...
```

## Configuration Options

### Relative Path (Recommended)
If your database server is in the MCP-projects directory:
```env
DB_SERVER_PATH=../../../MCP-projects/MCP-DbServer
```

### Absolute Path
If you want to use an absolute path:
```env
DB_SERVER_PATH=/Users/dashrathyadav/Desktop/dash/MCP-projects/MCP-DbServer
```

## Running the Application

1. Make sure your database MCP server is ready to run
2. Set up the `.env` file with correct paths
3. Run the application:

```bash
npm run build
npm run ai
```

## Testing the Setup

The application will:
1. Connect to AWS Bedrock
2. Connect to Atlassian MCP server
3. Connect to your database MCP server
4. Load all available tools from both servers
5. Allow you to query both Atlassian and database data

## Troubleshooting

### Database Server Not Found
- Check that `DB_SERVER_PATH` points to the correct directory
- Ensure the path contains the `MsDbServer.csproj` file
- Try using an absolute path instead of relative

### Connection Issues
- Make sure your database server is configured for stdio transport
- Verify the connection string is correct
- Check that SQL Server is running and accessible

### Tool Loading Issues
- Ensure both MCP servers are properly configured
- Check that the database server exposes MCP tools
- Verify the transport configuration in your database server 