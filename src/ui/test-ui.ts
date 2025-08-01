#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple test route
app.get('/api/status', (req, res) => {
    res.json({
        bedrock: true,
        knowledgeHub: true,
        mcpServers: ['atlassian', 'bitbucket-server', 'database-server-mssql'],
        timestamp: new Date().toISOString()
    });
});

// Test query route
app.post('/api/query', (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'No prompt provided' });
    }

    // Simulate AI response
    const responses = [
        "This is a test response from the AI assistant. I can help you with Jira, Confluence, Bitbucket, database queries, and Knowledge Hub information.",
        "I understand you're asking about: " + prompt + ". This is a simulated response for testing the UI.",
        "Here's what I found for your query: " + prompt + ". This is a test response to verify the UI is working correctly.",
        "Based on your question about " + prompt + ", here's a detailed response with multiple paragraphs to test the scrolling functionality of the chat interface. This should be long enough to demonstrate how the UI handles longer responses and ensures the chat area is properly scrollable.",
        "Test response with **bold text** and *italic text* and `code snippets` to verify formatting works correctly."
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    setTimeout(() => {
        res.json({
            success: true,
            response: randomResponse,
            timestamp: new Date().toISOString()
        });
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
});

// Start server
app.listen(PORT, () => {
    console.log(`🧪 Test UI Server running at http://localhost:${PORT}`);
    console.log(`📱 Open your browser and navigate to http://localhost:${PORT}`);
    console.log(`🔧 This is a test server with simulated responses`);
}); 