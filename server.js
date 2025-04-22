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

function updateEnvFile() {
    const envPath = path.join(__dirname, '.env');

    try {
        // Read existing .env file
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Check if JWT_SECRET is already defined
        if (envContent.includes('JWT_SECRET=')) {
            // Extract the existing secret
            const match = envContent.match(/JWT_SECRET=([^\n]+)/);
            if (match && match[1].trim()) {
                process.env.JWT_SECRET = match[1].trim();
                console.log('Using existing JWT_SECRET from .env file');
                return;
            }

            // Replace the existing line with a new secret
            const newSecret = generateJwtSecret();
            envContent = envContent.replace(/JWT_SECRET=([^\n]*)/, `JWT_SECRET=${newSecret}`);
            process.env.JWT_SECRET = newSecret;
        } else {
            // Add JWT_SECRET if it doesn't exist
            const newSecret = generateJwtSecret();
            envContent += `\n# JWT Configuration\nJWT_SECRET=${newSecret}\nJWT_EXPIRY=7d\n`;
            process.env.JWT_SECRET = newSecret;
        }

        // Write back to .env file
        fs.writeFileSync(envPath, envContent);
        console.log('JWT_SECRET configured in .env file');
    } catch (err) {
        console.error('Error updating .env file:', err);
        // Fallback to in-memory secret
        process.env.JWT_SECRET = process.env.JWT_SECRET || generateJwtSecret();
    }
}

// Call the function to update the .env file
updateEnvFile();

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
const authApi = require('./api/auth/index');
const businessApi = require('./api/business');
const contactApi = require('./api/contact');
const incentivesApi = require('./api/incentives');
const usersApi = require('./api/users/index');
const adminApi = require('./api/admin/users/index');
const adminUsersApi = require('./api/admin/users/[userId]');


// Mount consolidated API routes
app.all('/api/business', createApiHandler(businessApi));
app.all('/api/contact', createApiHandler(contactApi));
app.all('/api/incentives', createApiHandler(incentivesApi));
app.all('/api/users/index', createApiHandler(usersApi));
app.all('/api/auth', createApiHandler(authApi));
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