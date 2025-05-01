// client/js/env-config.js
(function() {
    // This script runs at runtime to set environment variables from Vercel
    window.ENV = window.ENV || {};

    function setupGoogleMapsApiKey() {
        // Try to get the API key from Vercel's runtime environment variables
        const apiKey = window.ENV.GOOGLE_MAPS_API_KEY;

        if (apiKey) {
            // Find the Google Maps script tag
            const mapsScript = document.getElementById('google-maps-script');

            if (mapsScript) {
                // Replace the placeholder with the actual API key
                const src = mapsScript.getAttribute('src');
                mapsScript.setAttribute('src', src.replace('YOUR_API_KEY_HERE', apiKey));
            }
        }
    }

    // Run when the DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupGoogleMapsApiKey);
    } else {
        setupGoogleMapsApiKey();
    }
})();