# 🔐 Authentication Setup Guide

This guide will help you set up authentication for the Atlassian MCP Client so you can use `npm run ai` successfully.

## Prerequisites

- Node.js 18+ installed
- Access to an Atlassian Cloud instance (Jira/Confluence)
- Admin access to create OAuth apps in your Atlassian instance

## Step 1: Create Atlassian OAuth App

### 1.1 Go to Atlassian Developer Console

1. Navigate to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Sign in with your Atlassian account
3. Click **"Create app"**

### 1.2 Configure Your OAuth App

1. **App name**: Choose a descriptive name (e.g., "MCP Client")
2. **App type**: Select **"OAuth 2.0 (3LO)"**
3. **App description**: Add a description (optional)

### 1.3 Configure OAuth Settings

1. Go to **"OAuth 2.0 (3LO)"** in the left sidebar
2. Add the following **Callback URLs**:
   ```
   http://localhost:3000/callback
   http://127.0.0.1:3000/callback
   ```
3. Add the following **Scopes**:
   ```
   read:jira-user
   read:jira-work
   write:jira-work
   manage:jira-project
   read:confluence-content.all
   write:confluence-content
   read:confluence-space.summary
   read:confluence-props
   write:confluence-props
   ```

### 1.4 Get Your Credentials

1. Go to **"Settings"** in the left sidebar
2. Copy the following values:
   - **Client ID**
   - **Client Secret**

## Step 2: Set Up Environment Variables

### 2.1 Create .env File

Create a `.env` file in the project root:

```bash
# Atlassian OAuth Configuration
ATLASSIAN_SITE_URL=your-site.atlassian.net
ATLASSIAN_CLIENT_ID=your-client-id-from-step-1
ATLASSIAN_CLIENT_SECRET=your-client-secret-from-step-1
ATLASSIAN_REDIRECT_URI=http://localhost:3000/callback

# Google Gemini AI (for AI features)
GEMINI_API_KEY=your-gemini-api-key

# Optional Configuration
PORT=3000
LOG_LEVEL=info
DEBUG_MODE=false
```

### 2.2 Replace Placeholder Values

- **`your-site.atlassian.net`**: Your Atlassian Cloud instance URL
- **`your-client-id-from-step-1`**: The Client ID from Step 1.4
- **`your-client-secret-from-step-1`**: The Client Secret from Step 1.4
- **`your-gemini-api-key`**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Step 3: Test Authentication

### 3.1 Run Authentication Test

```bash
# Test OAuth authentication
npm run auth:test

# Or run the debug script directly
npx tsx debug-oauth.ts
```

This will:
1. Open your browser for OAuth authentication
2. Ask you to authorize the app
3. Test the authentication tokens
4. Show you if everything is working

### 3.2 Expected Output

If successful, you should see:
```
🔍 OAuth Debug Session
=====================

📋 Token Details:
   - Access Token Length: 1234 chars
   - Token Type: Bearer
   - Scope: read:jira-user read:jira-work ...
   - Expires In: 3600 seconds

🌐 Testing: /rest/api/3/myself
   Status: 200 OK
   ✅ Success! Response keys: accountId, name, emailAddress, ...

🌐 Testing: /rest/api/3/serverInfo
   Status: 200 OK
   ✅ Success! Response keys: baseUrl, version, ...
```

## Step 4: Run the AI Client

Once authentication is working:

```bash
# Start the AI client
npm run ai
```

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variables"
**Solution**: Make sure your `.env` file exists and has all required variables.

#### 2. "Invalid Atlassian site URL"
**Solution**: Use the format `your-site.atlassian.net` (without https://)

#### 3. "OAuth authentication failed"
**Solutions**:
- Check that your Client ID and Secret are correct
- Verify the callback URL matches exactly: `http://localhost:3000/callback`
- Ensure all required scopes are added to your OAuth app

#### 4. "Port 3000 already in use"
**Solution**: Change the PORT in your `.env` file to another port (e.g., 3001)

#### 5. "MCP connection failed"
**Solutions**:
- Ensure your OAuth app has the correct scopes
- Check that your Atlassian instance supports the MCP server
- Verify network connectivity

### Getting Help

If you're still having issues:

1. Check the [Atlassian MCP Documentation](https://developer.atlassian.com/cloud/mcp/)
2. Verify your OAuth app configuration in the Atlassian Developer Console
3. Check the browser console for any OAuth errors
4. Ensure your Atlassian instance has the necessary permissions

## Security Notes

- Never commit your `.env` file to version control
- Keep your Client Secret secure
- The OAuth tokens are stored temporarily and automatically refresh
- You can revoke access anytime from your Atlassian account settings clear