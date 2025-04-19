// server.js - Main server entry point for local development
const express = require('express');
const path = require('path');
const cors = require('cors');

// API route handlers
const businessApi = require('./api/business');
const businessSearchApi = require('./api/business-search');
const contactApi = require('./api/contact');
const incentivesApi = require('./api/incentives/index');
const incentivesAddApi = require('./api/incentives/add');
const loginApi = require('./api/login');
const registerApi = require('./api/register');
const testApi = require('./api/test');
const usersPasswordApi = require('./api/users/password');
const usersUpdateApi = require('./api/users/update');
const verifyAdminCodeApi = require('./api/verify-admin-code');

// Create Express app
const app = express();

// Enable JSON parsing and CORS
app.use(express.json());
app.use(cors());

// Add a debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Mount API routes
app.use('/api/business', businessApi);
app.use('/api/business-search', businessSearchApi);
app.use('/api/contact', contactApi);
app.use('/api/incentives', incentivesApi);
app.use('/api/incentives/add', incentivesAddApi);
app.use('/api/login', loginApi);
app.use('/api/register', loginApi);
app.use('/api/test', testApi);
app.use('/api/users/password', usersPasswordApi);
app.use('/api/users/update', usersUpdateApi);
app.use('/api/verify-admin-code', verifyAdminCodeApi);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route definitions for HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// For any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the Express app for serverless environments
module.exports = app;