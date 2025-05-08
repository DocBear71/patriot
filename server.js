// server.js - Main server entry point for local development
const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto'); // Add this for generating secure random values
const fs = require('fs'); // Add this for file operations
require('dotenv').config(); // Make sure this is at the top to load environment variables

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

// Check for Google Maps API key
function checkGoogleMapsApiKey() {
    const envPath = path.join(__dirname, '.env');

    try {
        // Read existing .env file
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Check if Google Maps API key is defined
        if (!envContent.includes('GOOGLE_MAPS_API_KEY=')) {
            console.warn('⚠️ GOOGLE_MAPS_API_KEY not found in .env file. Google Maps features will not work properly.');
            console.warn('Please add your Google Maps API key to the .env file:');
            console.warn('GOOGLE_MAPS_API_KEY=your_api_key_here');
        } else if (envContent.includes('GOOGLE_MAPS_API_KEY=') && !process.env.GOOGLE_MAPS_API_KEY) {
            console.warn('⚠️ GOOGLE_MAPS_API_KEY found in .env file but not loaded. Check your dotenv configuration.');
        } else {
            console.log('Google Maps API key configured ✓');
        }
    } catch (err) {
        console.error('Error checking for Google Maps API key:', err);
    }
}

// Call the function to update the .env file
updateEnvFile();
checkGoogleMapsApiKey();

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

// setup route handler function for API endpoints
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
const usersApi = require('./api/users'); // Updated to point to the consolidated users API

// Import Google Maps API modules
const geocodeApi = require('./api/geocode');
const placesApi = require('./api/places');

// Mount consolidated API routes
app.all('/api/business', createApiHandler(businessApi));
app.all('/api/contact', createApiHandler(contactApi));
app.all('/api/incentives', createApiHandler(incentivesApi));
app.all('/api/auth', createApiHandler(authApi));

// Mount the consolidated users API with all route patterns
app.all('/api/users', createApiHandler(usersApi));
app.all('/api/users/:operation', createApiHandler(usersApi));
app.all('/api/admin/users', createApiHandler(usersApi));
app.all('/api/admin/users/:userId', createApiHandler(usersApi));

// Mount Google Maps API endpoints
app.get('/api/geocode', createApiHandler(geocodeApi));
app.get('/api/places/search', createApiHandler(placesApi.search));
app.get('/api/places/details/:placeId', createApiHandler(placesApi.details));

// Mount legacy API routes to maintain backward compatibility
app.all('/api/login', createApiHandler(authApi));
app.all('/api/register', createApiHandler(authApi));
app.all('/api/verify-admin-code', createApiHandler(authApi));
app.all('/api/business-search', createApiHandler(businessApi));
app.all('/api/incentives/add', createApiHandler(incentivesApi));

// Special handling for the legacy user routes to ensure they work with our consolidated API
app.all('/api/users/password', (req, res) => {
    req.query.operation = 'password';
    createApiHandler(usersApi)(req, res);
});

app.all('/api/users/update', (req, res) => {
    req.query.operation = 'update';
    createApiHandler(usersApi)(req, res);
});

app.all('/api/users/profile', (req, res) => {
    req.query.operation = 'profile';
    createApiHandler(usersApi)(req, res);
});

app.all('/api/users/get', (req, res) => {
    req.query.operation = 'get';
    createApiHandler(usersApi)(req, res);
});

// test API route
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'API is working!' });
});

// Add a Google Maps API test endpoint to check if API key is configured properly
app.get('/api/maps-test', (req, res) => {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({
            success: false,
            message: 'Google Maps API key is not configured. Please add GOOGLE_MAPS_API_KEY to your .env file.'
        });
    }

    res.status(200).json({
        success: true,
        message: 'Google Maps API key is configured',
        keyLength: process.env.GOOGLE_MAPS_API_KEY.length
    });
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
        console.log(`Server URL: http://localhost:${PORT}`);

        // Print API routes info
        console.log('\nAPI Routes:');
        console.log('- Auth: /api/auth, /api/login, /api/register');
        console.log('- Business: /api/business, /api/business-search');
        console.log('- Google Maps: /api/geocode, /api/places/search, /api/places/details/:placeId');
        console.log('- Test: /api/test, /api/maps-test');
    });
}

// Export the Express app for serverless environments
module.exports = app;