// server.js - Main server entry point for local development
const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto'); // Add this for generating secure random values
const fs = require('fs'); // Add this for file operations

// JWT Secret Generation
function generateJwtSecret() {
    return crypto.randomBytes(64).toString('hex');
}

function getOrCreateJwtSecret() {
    // Check if secret exists in environment
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }

    // Try to load from a secret file
    const secretFilePath = path.join(__dirname, '.jwt-secret');
    try {
        if (fs.existsSync(secretFilePath)) {
            const secret = fs.readFileSync(secretFilePath, 'utf8').trim();
            if (secret) {
                process.env.JWT_SECRET = secret;
                return secret;
            }
        }
    } catch (err) {
        console.error('Error reading JWT secret file:', err);
    }

    // Generate new secret
    const newSecret = generateJwtSecret();
    process.env.JWT_SECRET = newSecret;

    // Save to file for persistence
    try {
        fs.writeFileSync(secretFilePath, newSecret);
        fs.chmodSync(secretFilePath, 0o600); // Secure file permissions
        console.log('New JWT secret generated and saved');
    } catch (err) {
        console.error('Error saving JWT secret file:', err);
    }

    return newSecret;
}

// Set up JWT secret early
const jwtSecret = getOrCreateJwtSecret();
console.log('JWT secret configured successfully');

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

// setup route handler function for API enpoints
function createApiHandler(apiModule) {
    return async (req, res) => {
        try {
            await apiModule(req, res);
        } catch (error) {
            console.error('API Error: ', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    };
}

// import consolidated API modules
const authApi = require('./api/auth');
const businessApi = require('./api/business');
const contactApi = require('./api/contact');
const incentivesApi = require('./api/incentives');
const usersApi = require('./api/users/index');
const adminApi = require('./api/admin/users/index');
const adminUsersApi = require('./api/admin/users/[userId]');


// Mount consolidated API routes
app.all('/api/auth', createApiHandler(authApi));
app.all('/api/business', createApiHandler(businessApi));
app.all('/api/contact', createApiHandler(contactApi));
app.all('/api/incentives', createApiHandler(incentivesApi));
app.all('/api/users/index', createApiHandler(usersApi));
app.all('/api/auth/index', createApiHandler(authApi));
app.all('/api/admin/users/index', createApiHandler(adminApi));
app.all('/api/admin/users/[userId]', createApiHandler(adminUsersApi));

// mount legacy API routes to maintain backward compatibility
app.all('/api/login', createApiHandler(authApi));
app.all('/api/register', createApiHandler(authApi));
app.all('/api/verify-admin-code', createApiHandler(authApi));
app.all('/api/business-search', createApiHandler(businessApi));
app.all('/api/incentives/add', createApiHandler(incentivesApi));
app.all('/api/users/password', createApiHandler(usersApi));
app.all('/api/users/update', createApiHandler(usersApi));

// test API route
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'API is working!' });
});

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