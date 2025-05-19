// server.js - Updated for consolidated API endpoints
const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

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

// Import consolidated API modules
const authApi = require('./api/auth');
const businessApi = require('./api/business');
const contactApi = require('./api/contact');
const combinedApi = require('./api/combined-api'); // The new combined API for admin-codes, incentives, etc.
const userDonationsApi = require('./api/user-donations'); // The new user-donations combined API
const authVerifyApi = require('./api/auth-verify'); // The auth verification API

// Import Google Maps API modules
const geocodeApi = require('./api/geocode');
const placesApi = require('./api/places');

// Mount main API routes
app.all('/api/auth', createApiHandler(authApi));
app.all('/api/business', createApiHandler(businessApi));
app.all('/api/contact', createApiHandler(contactApi));

// Mount consolidated API routes
app.all('/api/combined-api/*', (req, res) => {
    // Modify URL to extract the correct path parts for combined-api
    const originalUrl = req.url;
    const pathAfterPrefix = originalUrl.replace('/api/combined-api/', '');
    const pathParts = pathAfterPrefix.split('?')[0].split('/');

    // Store original URL parts in query for routing inside the module
    req.originalPath = pathParts;

    createApiHandler(combinedApi)(req, res);
});

// Mount user-donations API
app.all('/api/user-donations/*', (req, res) => {
    // Modify URL to extract the correct path parts for user-donations
    const originalUrl = req.url;
    const pathAfterPrefix = originalUrl.replace('/api/user-donations/', '');
    const pathParts = pathAfterPrefix.split('?')[0].split('/');

    // Store original URL parts in query for routing inside the module
    req.originalPath = pathParts;

    createApiHandler(userDonationsApi)(req, res);
});

// Mount auth-verify API
app.all('/api/auth-verify', createApiHandler(authVerifyApi));

// Mount Google Maps API endpoints
app.get('/api/geocode', createApiHandler(geocodeApi));
app.get('/api/places/search', createApiHandler(placesApi.search));
app.get('/api/places/details/:placeId', createApiHandler(placesApi.details));

// ====== Backwards Compatibility Routes ======

// Mount legacy API routes to maintain backward compatibility
app.all('/api/login', (req, res) => {
    req.query.operation = 'login';
    createApiHandler(authApi)(req, res);
});

app.all('/api/register', (req, res) => {
    req.query.operation = 'register';
    createApiHandler(authApi)(req, res);
});

app.all('/api/verify-admin-code', (req, res) => {
    req.query.operation = 'verify-admin';
    createApiHandler(authApi)(req, res);
});

app.all('/api/verify-token', (req, res) => {
    req.query.operation = 'verify-token';
    createApiHandler(authVerifyApi)(req, res);
});

// Legacy business routes
app.all('/api/business-search', (req, res) => {
    req.query.operation = 'search';
    createApiHandler(businessApi)(req, res);
});

// Legacy incentives routes - map to combined API
app.all('/api/incentives', (req, res) => {
    // For incentives, redirect to the combined-api with the path set to incentives
    req.url = req.url.replace('/api/incentives', '/api/combined-api/incentives');
    const pathAfterPrefix = 'incentives';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(combinedApi)(req, res);
});

app.all('/api/incentives/add', (req, res) => {
    // Set operation to 'add' for /api/incentives/add
    req.query.operation = 'add';
    req.url = req.url.replace('/api/incentives/add', '/api/combined-api/incentives');
    const pathAfterPrefix = 'incentives';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(combinedApi)(req, res);
});

// Legacy admin routes - map to combined API
app.all('/api/admin-codes*', (req, res) => {
    req.url = req.url.replace('/api/admin-codes', '/api/combined-api/admin-codes');
    const pathAfterPrefix = 'admin-codes';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(combinedApi)(req, res);
});

app.all('/api/admin-incentives*', (req, res) => {
    req.url = req.url.replace('/api/admin-incentives', '/api/combined-api/admin-incentives');
    const pathAfterPrefix = 'admin-incentives';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(combinedApi)(req, res);
});

// Legacy user routes - map to user-donations API
app.all('/api/users', (req, res) => {
    req.url = req.url.replace('/api/users', '/api/user-donations/user');
    const pathAfterPrefix = 'user';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(userDonationsApi)(req, res);
});

app.all('/api/users/password', (req, res) => {
    req.query.operation = 'password';
    req.url = req.url.replace('/api/users/password', '/api/user-donations/user');
    const pathAfterPrefix = 'user';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(userDonationsApi)(req, res);
});

app.all('/api/users/update', (req, res) => {
    req.query.operation = 'update';
    req.url = req.url.replace('/api/users/update', '/api/user-donations/user');
    const pathAfterPrefix = 'user';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(userDonationsApi)(req, res);
});

app.all('/api/users/profile', (req, res) => {
    req.query.operation = 'profile';
    req.url = req.url.replace('/api/users/profile', '/api/user-donations/user');
    const pathAfterPrefix = 'user';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(userDonationsApi)(req, res);
});

app.all('/api/users/get', (req, res) => {
    req.query.operation = 'get';
    req.url = req.url.replace('/api/users/get', '/api/user-donations/user');
    const pathAfterPrefix = 'user';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(userDonationsApi)(req, res);
});

// Legacy donations routes - map to user-donations API
app.all('/api/donations*', (req, res) => {
    // Extract operation from URL path if present
    const match = req.url.match(/\/api\/donations\/([^?\/]+)/);
    if (match && match[1]) {
        req.query.operation = match[1];
    }

    req.url = req.url.replace(/\/api\/donations(?:\/[^?\/]+)?/, '/api/user-donations/donations');
    const pathAfterPrefix = 'donations';
    req.originalPath = [pathAfterPrefix];
    createApiHandler(userDonationsApi)(req, res);
});

// Test API route
app.get('/api/test', (req, res) => {
    res.status(200).json({
        message: 'API is working!',
        consolidatedApis: [
            '/api/combined-api',
            '/api/user-donations',
            '/api/auth-verify'
        ]
    });
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
        console.log('- Consolidated APIs:');
        console.log('  * /api/combined-api - Admin-codes, incentives');
        console.log('  * /api/user-donations - User management and donations');
        console.log('  * /api/auth-verify - Token verification');
        console.log('- Google Maps: /api/geocode, /api/places/search, /api/places/details/:placeId');
        console.log('- Test: /api/test, /api/maps-test');
        console.log('\nBackward compatibility routes are maintained.');
    });
}

// Export the Express app for serverless environments
module.exports = app;