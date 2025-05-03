// File: src/js/runtime-config.js
// This file will be copied to public/js and will be replaced during build
// Runtime configuration for Google Maps and other services
window.appConfig = {
    // Your Google Maps API key (from environment variable or fallback)
    googleMapsApiKey: typeof process !== 'undefined' && process.env.GOOGLE_MAPS_API_KEY
        ? process.env.GOOGLE_MAPS_API_KEY
        : 'YOUR_FALLBACK_API_KEY',

    // Map ID for Advanced Markers (from environment variable or fallback)
    googleMapsMapId: typeof process !== 'undefined' && process.env.GOOGLE_MAPS_MAP_ID
        ? process.env.GOOGLE_MAPS_MAP_ID
        : 'ebe8ec43a7bc252d',

    // Other configuration settings can be added here
    environment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'development'
        : 'production'
};