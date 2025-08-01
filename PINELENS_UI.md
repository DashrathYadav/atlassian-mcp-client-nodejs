# 🌲 PineLens - Unified Search Dashboard

A clean, minimalist search interface inspired by Microsoft Copilot and Google Gemini, designed for unified access to multiple data sources through Amazon Bedrock LLMs and MCP servers.

## 🎨 Design Features

- **Minimalist Interface**: Clean, distraction-free design with light gray background
- **Pine Tree Branding**: Distinctive pine tree icon (🌲) for brand recognition
- **Toggle Switch**: Configurable feature toggle in the header
- **Centered Search**: Prominent search bar with magnifying glass icon
- **Information Display**: Large white box for displaying search results
- **Responsive Design**: Mobile-friendly layout that adapts to different screen sizes

## 🚀 Quick Start

### Test the UI (Simulated Responses)
```bash
npm run ui:test
```
Then open your browser to `http://localhost:3000`

### Run with Full Backend Integration
```bash
npm run ui
```
This connects to all MCP servers (Atlassian, Bitbucket, Database) and AWS Bedrock.

## 🎯 How It Works

1. **Search Input**: Type your query in the search bar and press Enter
2. **Backend Processing**: Your query is routed to the appropriate services:
   - **AWS Bedrock**: For AI analysis and response generation
   - **MCP Servers**: For accessing Jira, Confluence, Bitbucket, and database data
   - **Knowledge Hub**: For organizational knowledge and API specifications
3. **Result Display**: The response appears in the information display area

## 🔧 Configuration

### Environment Variables
- `AWS_REGION`: AWS region for Bedrock (default: ap-south-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `BEDROCK_KB_ID`: Knowledge Hub ID (optional)
- `BEDROCK_MODEL_ID`: Bedrock model ARN (optional)
- `DB_CONNECTION_STRING`: Database connection string
- `DB_SERVER_PATH`: Path to database MCP server

### Toggle Switch
The toggle switch in the header can be configured for various features:
- Enable/disable specific data sources
- Toggle between different AI models
- Switch between light/dark themes
- Enable/disable real-time search suggestions

## 📱 UI Components

### Header
- **Logo**: Pine tree icon (🌲) + "PineLens" text
- **Toggle Switch**: Horizontal toggle for feature control

### Search Bar
- **Icon**: Magnifying glass on the left
- **Input**: Clean text input with placeholder "Search"
- **Behavior**: Press Enter to search

### Information Display
- **Header**: Diamond icon (◆) + title
- **Content**: Formatted text with support for:
  - Bold and italic text
  - Code snippets
  - Lists and bullet points
  - Line breaks and paragraphs

### Loading State
- **Spinner**: Animated loading indicator
- **Text**: "Searching..." message

## 🎨 Styling

### Color Scheme
- **Background**: Light gray (#f5f5f5)
- **Search Bar**: White with subtle shadow
- **Info Box**: White with rounded corners
- **Text**: Dark gray (#333) for readability

### Typography
- **Font**: System fonts (-apple-system, BlinkMacSystemFont, etc.)
- **Sizes**: Responsive font sizing
- **Weights**: Regular (400) and medium (500) weights

### Responsive Design
- **Mobile**: Stacked layout with adjusted spacing
- **Tablet**: Optimized for medium screens
- **Desktop**: Full-width layout with centered content

## 🔄 Integration Points

### Backend APIs
- `POST /api/query`: Send search queries
- `GET /api/status`: Check service status

### MCP Servers
- **Atlassian**: Jira and Confluence integration
- **Bitbucket**: Repository and pull request management
- **Database**: MSSQL database queries

### AI Services
- **AWS Bedrock**: Claude and other LLMs
- **Knowledge Hub**: Organizational knowledge base

## 🛠️ Development

### File Structure
```
src/ui/
├── public/
│   ├── index.html      # PineLens UI HTML
│   ├── styles.css      # PineLens styling
│   └── script.js       # Frontend JavaScript
├── server.ts           # Full backend server
├── test-ui.ts          # Test server with simulated responses
└── README.md           # UI documentation
```

### Customization
- Modify `styles.css` for visual changes
- Update `script.js` for behavior changes
- Edit `index.html` for structural changes

## 🎯 Example Queries

Try these example searches:
- "Show me all open tickets"
- "What are our API specifications?"
- "Tell me about Amadeus integration"
- "Query users table"
- "List all projects"

## 🌙 Dark Mode Support

The UI automatically adapts to system dark mode preferences with:
- Dark backgrounds
- Light text
- Adjusted contrast ratios
- Preserved readability

## 📈 Future Enhancements

- Real-time search suggestions
- Search history
- Voice input support
- Advanced filtering options
- Export functionality
- Custom themes
- Keyboard shortcuts

---

**PineLens** - Where search meets intelligence 🌲 