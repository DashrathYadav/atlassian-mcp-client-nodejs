# AI Assistant Web UI

A modern, responsive web interface for the AI Assistant with Multi-Server MCP Client and Knowledge Hub integration.

## Features

- 🎨 **Modern Design**: Clean, spacious interface with gradient backgrounds and smooth animations
- 📱 **Responsive**: Works on desktop, tablet, and mobile devices
- 💬 **Real-time Chat**: Interactive chat interface with message history
- 🔄 **Live Status**: Real-time status indicators for all connected services
- 📝 **Example Prompts**: Quick access to common queries
- 🎯 **Auto-scroll**: Automatically scrolls to new messages
- 🌙 **Dark Mode**: Automatic dark mode support based on system preferences
- ⚡ **Fast Loading**: Optimized for quick response times

## Quick Start

### Test the UI (No Configuration Required)

To test the UI with simulated responses:

```bash
npm run ui:test
```

This will start a test server at `http://localhost:3000` with simulated AI responses.

### Full UI with Real AI Integration

To use the full UI with actual AI, MCP servers, and Knowledge Hub:

```bash
npm run ui
```

**Prerequisites:**
- AWS credentials configured in `.env`
- Knowledge Hub configured (optional)
- MCP servers available (optional)

## Environment Variables

Make sure your `.env` file contains:

```bash
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Knowledge Hub (Optional)
BEDROCK_KB_ID=your-knowledge-base-id
BEDROCK_MODEL_ID=apac.anthropic.claude-sonnet-4-20250514-v1:0

# Database (Optional)
DB_SERVER_PATH=../../../MCP-projects/MCP-DbServer
DB_CONNECTION_STRING=Server=localhost,1433;Database=app_db;User Id=sa;Password=Temp@123;TrustServerCertificate=true;
```

## Usage

1. **Start the UI**: Run `npm run ui` or `npm run ui:test`
2. **Open Browser**: Navigate to `http://localhost:3000`
3. **Ask Questions**: Type your query in the text area
4. **Use Examples**: Click on example prompts for quick queries
5. **Monitor Status**: Check the status indicators in the header

## Example Queries

- **Jira**: "Show me all open tickets", "Get details for ticket MD-1"
- **Knowledge Hub**: "What are our API specifications?", "Tell me about Amadeus integration"
- **Database**: "Query users table", "Show database schema"
- **General**: "List all projects", "Find high priority bugs"

## UI Components

### Header
- Service status indicators (Bedrock, Knowledge Hub, MCP Servers)
- Real-time connection status with color-coded indicators

### Input Section
- Large textarea for queries
- Send button with loading states
- Example prompt buttons for quick access

### Chat History
- Scrollable message history
- User and AI message bubbles
- Timestamps for each message
- Auto-scroll to latest messages

### Responsive Design
- Mobile-friendly layout
- Adaptive textarea sizing
- Touch-friendly buttons

## API Endpoints

The UI communicates with the backend via these endpoints:

- `GET /api/status` - Get service connection status
- `POST /api/query` - Send a query to the AI assistant

## Troubleshooting

### UI Not Loading
- Check if the server is running on the correct port
- Verify all dependencies are installed
- Check browser console for errors

### No AI Responses
- Verify AWS credentials are configured
- Check server logs for connection errors
- Ensure all required environment variables are set

### Status Indicators Red
- Check network connectivity
- Verify service configurations
- Review server logs for specific errors

## Development

### File Structure
```
src/ui/
├── server.ts          # Main server with full integration
├── test-ui.ts         # Test server with simulated responses
├── public/
│   ├── index.html     # Main HTML file
│   ├── styles.css     # CSS styles
│   └── script.js      # Frontend JavaScript
└── README.md          # This file
```

### Customization
- Modify `styles.css` for visual changes
- Update `script.js` for behavior changes
- Edit `index.html` for structural changes

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Performance

- Optimized for fast loading
- Minimal dependencies
- Efficient DOM updates
- Responsive design for all screen sizes 