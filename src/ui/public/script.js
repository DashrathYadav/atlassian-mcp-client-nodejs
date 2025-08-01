// UI State
let isProcessing = false;

// DOM Elements
const promptInput = document.getElementById('prompt-input');
const sendButton = document.getElementById('send-button');
const chatHistory = document.getElementById('chat-history');
const loadingContainer = document.getElementById('loading');
const exampleButtons = document.querySelectorAll('.example-btn');
const statusIndicators = {
    bedrock: document.getElementById('bedrock-status'),
    knowledgeHub: document.getElementById('knowledge-hub-status'),
    mcp: document.getElementById('mcp-status')
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    checkServerStatus();
    setWelcomeTime();
});

function initializeUI() {
    // Set welcome time
    setWelcomeTime();
    
    // Add event listeners
    sendButton.addEventListener('click', handleSendMessage);
    promptInput.addEventListener('keydown', handleKeyPress);
    
    // Add example button listeners
    exampleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const prompt = this.getAttribute('data-prompt');
            promptInput.value = prompt;
            promptInput.focus();
        });
    });
    
    // Auto-resize textarea
    promptInput.addEventListener('input', autoResizeTextarea);
}

function setWelcomeTime() {
    const welcomeTime = document.getElementById('welcome-time');
    if (welcomeTime) {
        welcomeTime.textContent = new Date().toLocaleTimeString();
    }
}

function autoResizeTextarea() {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
}

async function handleSendMessage() {
    const prompt = promptInput.value.trim();
    
    if (!prompt || isProcessing) {
        return;
    }
    
    // Add user message to chat
    addMessageToChat('user', prompt);
    
    // Clear input and disable send button
    promptInput.value = '';
    promptInput.style.height = 'auto';
    setProcessingState(true);
    
    try {
        // Show loading
        showLoading();
        
        // Send request to server
        const response = await sendQueryToServer(prompt);
        
        // Hide loading
        hideLoading();
        
        // Add AI response to chat
        addMessageToChat('ai', response);
        
    } catch (error) {
        hideLoading();
        console.error('Error processing message:', error);
        
        // Add error message
        addMessageToChat('ai', `Sorry, I encountered an error while processing your request: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
        setProcessingState(false);
        promptInput.focus();
    }
}

function setProcessingState(processing) {
    isProcessing = processing;
    sendButton.disabled = processing;
    
    if (processing) {
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    } else {
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
    }
}

function showLoading() {
    loadingContainer.style.display = 'block';
    scrollToBottom();
}

function hideLoading() {
    loadingContainer.style.display = 'none';
}

async function sendQueryToServer(prompt) {
    const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response;
}

function addMessageToChat(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'message-sender';
    senderSpan.textContent = sender === 'user' ? 'You' : 'AI Assistant';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = new Date().toLocaleTimeString();
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Format the content (handle line breaks, lists, etc.)
    textDiv.innerHTML = formatMessageContent(content);
    
    // Assemble the message
    headerDiv.appendChild(senderSpan);
    headerDiv.appendChild(timeSpan);
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(textDiv);
    
    if (sender === 'user') {
        avatar.innerHTML = '<i class="fas fa-user"></i>';
    } else {
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    // Add to chat history
    chatHistory.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
}

function formatMessageContent(content) {
    // Handle line breaks
    let formatted = content.replace(/\n/g, '<br>');
    
    // Handle basic markdown-style formatting
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle code blocks (simple)
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Handle lists (simple bullet points)
    formatted = formatted.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return formatted;
}

function scrollToBottom() {
    setTimeout(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 100);
}

async function checkServerStatus() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const status = await response.json();
            updateStatusIndicators(status);
        }
    } catch (error) {
        console.error('Failed to check server status:', error);
        // Mark all as disconnected if we can't reach the server
        updateStatusIndicators({
            bedrock: false,
            knowledgeHub: false,
            mcpServers: []
        });
    }
}

function updateStatusIndicators(status) {
    // Update Bedrock status
    if (statusIndicators.bedrock) {
        statusIndicators.bedrock.classList.toggle('connected', status.bedrock);
    }
    
    // Update Knowledge Hub status
    if (statusIndicators.knowledgeHub) {
        statusIndicators.knowledgeHub.classList.toggle('connected', status.knowledgeHub);
    }
    
    // Update MCP status
    if (statusIndicators.mcp) {
        const hasMcpServers = status.mcpServers && status.mcpServers.length > 0;
        statusIndicators.mcp.classList.toggle('connected', hasMcpServers);
    }
}

// Periodic status check
setInterval(checkServerStatus, 30000); // Check every 30 seconds

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        checkServerStatus();
    }
});

// Handle window focus
window.addEventListener('focus', function() {
    checkServerStatus();
}); 