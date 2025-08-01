// UI State
let isProcessing = false;
let isDarkMode = false;

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const infoContent = document.getElementById('info-content');
const toggleInput = document.getElementById('toggle');
const body = document.body;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    checkServerStatus();
    initializeTheme();
});

function initializeUI() {
    // Add event listeners
    searchInput.addEventListener('keydown', handleKeyPress);
    searchInput.addEventListener('input', handleSearchInput);
    searchButton.addEventListener('click', handleSearch);
    
    // Add toggle switch listener
    toggleInput.addEventListener('change', handleToggleChange);
    
    // Focus on search input
    searchInput.focus();
}

function initializeTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('pinelens-theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        toggleInput.checked = true;
        enableDarkMode();
    } else {
        isDarkMode = false;
        toggleInput.checked = false;
        enableLightMode();
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
    }
}

function handleSearchInput(event) {
    // Real-time search functionality can be added here
    // For now, we'll just handle Enter key
}

function handleToggleChange(event) {
    // Handle theme toggle
    isDarkMode = event.target.checked;
    
    if (isDarkMode) {
        enableDarkMode();
        localStorage.setItem('pinelens-theme', 'dark');
    } else {
        enableLightMode();
        localStorage.setItem('pinelens-theme', 'light');
    }
}

function enableDarkMode() {
    body.classList.add('dark-mode');
    body.classList.remove('light-mode');
}

function enableLightMode() {
    body.classList.add('light-mode');
    body.classList.remove('dark-mode');
}

async function handleSearch() {
    const query = searchInput.value.trim();
    
    if (!query || isProcessing) {
        return;
    }
    
    setProcessingState(true);
    
    try {
        // Show loading in the output window
        showLoadingInOutput();
        
        // Send request to server
        const response = await sendQueryToServer(query);
        
        // Update information display with the response
        updateInfoDisplay(response);
        
        // Clear the search input after successful search
        searchInput.value = '';
        
    } catch (error) {
        console.error('Error processing search:', error);
        
        // Show error in info display
        updateInfoDisplay(`Sorry, I encountered an error while processing your search: ${error.message || 'Unknown error'}. Please try again.`);
        
        // Clear the search input even on error
        searchInput.value = '';
    } finally {
        setProcessingState(false);
        // Refocus on search input after clearing
        searchInput.focus();
    }
}

function setProcessingState(processing) {
    isProcessing = processing;
    searchInput.disabled = processing;
    searchButton.disabled = processing;
}

function showLoadingInOutput() {
    // Show loading state directly in the output window
    const loadingHTML = `
        <div class="loading-in-output">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p>Searching...</p>
        </div>
    `;
    infoContent.innerHTML = loadingHTML;
    
    // Add a subtle animation
    infoContent.style.opacity = '0';
    setTimeout(() => {
        infoContent.style.opacity = '1';
    }, 50);
}

async function sendQueryToServer(query) {
    const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: query })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response;
}

function updateInfoDisplay(content) {
    // Format the content for display
    const formattedContent = formatContent(content);
    
    // Update the info content
    infoContent.innerHTML = formattedContent;
    
    // Add a subtle animation
    infoContent.style.opacity = '0';
    setTimeout(() => {
        infoContent.style.opacity = '1';
    }, 50);
}

function formatContent(content) {
    // Handle code blocks first (before other formatting)
    let formatted = content;
    
    // Handle multi-line code blocks (```code```)
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, language, code) {
        const lang = language || 'text';
        return `<div class="code-block">
            <div class="code-header">
                <span class="code-language">${lang}</span>
                <button class="copy-button" onclick="copyCode(this)">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>
        </div>`;
    });
    
    // Handle inline code blocks (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Handle headers
    formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Handle bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle strikethrough
    formatted = formatted.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // Handle links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Handle unordered lists
    formatted = formatted.replace(/^[-*+]\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Handle ordered lists
    formatted = formatted.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    
    // Handle blockquotes
    formatted = formatted.replace(/^>\s+(.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Handle horizontal rules
    formatted = formatted.replace(/^---$/gm, '<hr>');
    
    // Handle line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags if not already wrapped and doesn't contain block elements
    if (!formatted.startsWith('<') || formatted.startsWith('<p>')) {
        formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to copy code to clipboard
function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        // Show success feedback
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show success feedback
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    });
}

async function checkServerStatus() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const status = await response.json();
            // You can add status indicators here if needed
            console.log('Server status:', status);
        }
    } catch (error) {
        console.error('Failed to check server status:', error);
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

// Add some example queries for demonstration
const exampleQueries = [
    "Show me all open tickets",
    "What are our API specifications?",
    "Tell me about Amadeus integration",
    "Query users table",
    "List all projects"
];

// You can add a function to populate example queries if needed
function populateExampleQueries() {
    // This could be used to show example queries in the UI
    console.log('Available example queries:', exampleQueries);
} 