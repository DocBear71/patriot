// api/test.js
const express = require('express');
const cors = require('cors');

// Create an Express server instance
const app = express();

// Enable CORS for all routes
app.use(cors());

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// Export the Express API
module.exports = app;