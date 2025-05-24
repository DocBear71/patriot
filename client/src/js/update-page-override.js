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

// Override ALL search-related functions to use update-specific versions
window.performEnhancedBusinessSearch = function(formData, bustCache = false) {
    console.log("Override: Redirecting to update-specific search");
    if (typeof window.performUpdateBusinessSearch === 'function') {
        return window.performUpdateBusinessSearch(formData);
    }
    return Promise.resolve();
};

window.performEnhancedBusinessSearchWithNearbyFixed = function(formData, bustCache = false) {
    console.log("Override: Redirecting enhanced search to update-specific search");
    if (typeof window.performUpdateBusinessSearch === 'function') {
        return window.performUpdateBusinessSearch(formData);
    }
    return Promise.resolve();
};

window.retrieveFromMongoDB = function(formData, bustCache = false) {
    console.log("Override: Redirecting retrieveFromMongoDB to update-specific search");
    if (typeof window.performUpdateBusinessSearch === 'function') {
        return window.performUpdateBusinessSearch(formData);
    }
    return Promise.resolve();
};

// Override display functions
window.displaySearchResults = function(businesses) {
    console.log("Override: Redirecting to update display function");
    if (typeof window.displayUpdateSearchResults === 'function') {
        return window.displayUpdateSearchResults(businesses);
    }
    return;
};

window.displaySearchResultsWithBetterPriority = function(businesses) {
    console.log("Override: Redirecting priority display to update display");
    if (typeof window.displayUpdateSearchResults === 'function') {
        return window.displayUpdateSearchResults(businesses);
    }
    return;
};

window.displayBusinessesOnMapWithBetterPriority = function(businesses) {
    console.log("Override: Skipping map display, using table display");
    if (typeof window.displayUpdateSearchResults === 'function') {
        return window.displayUpdateSearchResults(businesses);
    }
    return;
};

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

// Override success/error message functions to prevent issues
window.showImprovedSearchSuccessMessage = function() {
    console.log("Override: Skipping success message on update page");
    return;
};

window.showNoResultsMessage = function() {
    console.log("Override: Using update-specific no results message");
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="no-results-message">
                <h3>No businesses found</h3>
                <p>No businesses match your search criteria. Please try different search terms.</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
    return;
};

window.showErrorMessage = function(message) {
    console.log("Override: Using update-specific error message");
    if (typeof window.showUpdateErrorMessage === 'function') {
        window.showUpdateErrorMessage(message);
    }
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