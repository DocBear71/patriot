// File: client/build.js
const fs = require('fs');
const path = require('path');

// Load dotenv to get environment variables from .env file
require('dotenv').config();

// Get API key from environment variable or use fallback
const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';

// Get Map ID from environment variable or use fallback
const mapId = process.env.GOOGLE_MAPS_MAP_ID || 'ebe8ec43a7bc252d';

console.log('Building with Google Maps API Key:', apiKey.substring(0, 10) + '...');
console.log('Building with Google Maps Map ID:', mapId);

// Create runtime config content with all required configuration
const configContent = `// Generated runtime config with extended configuration
window.appConfig = {
  // Your Google Maps API key (from environment variable or fallback)
  googleMapsApiKey: "${apiKey}",

  // Map ID for Advanced Markers (from environment variable or fallback)
  googleMapsMapId: "${mapId}",

  // Other configuration settings can be added here
  environment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'development'
    : 'production'
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