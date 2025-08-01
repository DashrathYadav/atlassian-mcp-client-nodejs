// UI State
let isProcessing = false;
let isDarkMode = false;

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const infoContent = document.getElementById('info-content');
const loadingContainer = document.getElementById('loading');
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
        // Show loading
        showLoading();
        
        // Send request to server
        const response = await sendQueryToServer(query);
        
        // Hide loading
        hideLoading();
        
        // Update information display
        updateInfoDisplay(response);
        
        // Clear the search input after successful search
        searchInput.value = '';
        
    } catch (error) {
        hideLoading();
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

function showLoading() {
    loadingContainer.style.display = 'block';
    infoContent.style.display = 'none';
}

function hideLoading() {
    loadingContainer.style.display = 'none';
    infoContent.style.display = 'block';
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
    // Handle line breaks
    let formatted = content.replace(/\n/g, '</p><p>');
    
    // Handle basic markdown-style formatting
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle code blocks (simple)
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Handle lists (simple bullet points)
    formatted = formatted.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Wrap in paragraph tags if not already wrapped
    if (!formatted.startsWith('<p>')) {
        formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
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