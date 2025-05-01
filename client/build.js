// File: client/build.js
const fs = require('fs');
const path = require('path');

// Load dotenv to get environment variables from .env file
require('dotenv').config();

// Get API key from environment variable or use fallback
const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';

console.log('Building with Google Maps API Key:', apiKey.substring(0, 10) + '...');

// Create runtime config content with the actual API key
const configContent = `// Generated runtime config with API key
window.appConfig = {
  googleMapsApiKey: "${apiKey}"
};`;

// Path to the public directory
const publicJsDir = path.resolve(__dirname, '../public/js');

// Ensure the directory exists
if (!fs.existsSync(publicJsDir)) {
    fs.mkdirSync(publicJsDir, { recursive: true });
}

// Write the runtime config file with the actual API key
fs.writeFileSync(path.join(publicJsDir, 'runtime-config.js'), configContent);

console.log('Runtime config file created successfully at: ' + path.join(publicJsDir, 'runtime-config.js'));