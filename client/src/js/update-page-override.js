/**
 * Update Page Override Script
 * Prevents business-search-improved.js from initializing Google Maps on the update page
 */

// Override functions that try to initialize Google Maps
console.log("Update page override: Preventing Google Maps initialization");

// Define dummy functions to prevent map initialization
window.ensureGoogleMapsInitialized = function() {
    console.log("Override: Blocking Google Maps initialization on update page");
    return Promise.resolve();
};

window.initGoogleMap = function() {
    console.log("Override: Blocking Google Map creation on update page");
    return;
};

// Provide dummy getGoogleMapsApiKey function if it's missing
if (typeof window.getGoogleMapsApiKey !== 'function') {
    window.getGoogleMapsApiKey = function() {
        console.log("Override: Dummy getGoogleMapsApiKey function");
        return '';
    };
}

// Override displayBusinessesOnMap to prevent map operations
window.displayBusinessesOnMap = function(businesses) {
    console.log("Override: Skipping map display on update page");
    return;
};

// Override the main search function to use update-specific search
if (typeof window.retrieveFromMongoDB === 'function') {
    // Store the original function
    window.originalRetrieveFromMongoDB = window.retrieveFromMongoDB;

    // Override with update-specific function
    window.retrieveFromMongoDB = function(formData, bustCache = false) {
        console.log("Override: Using update-specific search instead of map-based search");

        // Use our update search function instead
        if (typeof window.performUpdateBusinessSearch === 'function') {
            return window.performUpdateBusinessSearch(formData);
        } else {
            console.error("Update search function not available");
            return Promise.resolve();
        }
    };
}

// Set a flag to indicate this is an update page
window.isUpdatePage = true;

// Override any other map-related functions that might cause issues
window.clearMarkers = function() {
    console.log("Override: No markers to clear on update page");
    return;
};

window.createBusinessMarker = function() {
    console.log("Override: Not creating markers on update page");
    return null;
};

window.focusOnMapMarker = function() {
    console.log("Override: No map to focus on update page");
    return;
};

// Prevent any map container from being created
document.addEventListener('DOMContentLoaded', function() {
    // Remove any map containers that might have been created
    const mapContainers = document.querySelectorAll('#map, #map-container, .map-container');
    mapContainers.forEach(container => {
        console.log("Override: Removing map container from update page");
        container.remove();
    });

    console.log("Update page override: Initialization complete");
});