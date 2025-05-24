/**
 * Update Page Override Script
 * Prevents business-search-improved.js from initializing Google Maps on the update page
 */

// Set a flag immediately to indicate this is an update page
window.isUpdatePage = true;

console.log("Update page override: Preventing Google Maps initialization");

// Override functions that try to initialize Google Maps
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

// Override map-related functions
window.displayBusinessesOnMap = function(businesses) {
    console.log("Override: Skipping map display on update page");
    return;
};

window.displayBusinessesOnMapWithBetterPriority = function(businesses) {
    console.log("Override: Skipping map display, using table display");
    if (typeof window.displayUpdateSearchResults === 'function') {
        return window.displayUpdateSearchResults(businesses);
    }
    return;
};

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

// Override success/error message functions
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

// CRITICAL: Override the search and display functions AFTER DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Override: DOM loaded, applying comprehensive overrides");

    // Remove any map containers that might have been created
    const mapContainers = document.querySelectorAll('#map, #map-container, .map-container');
    mapContainers.forEach(container => {
        console.log("Override: Removing map container from update page");
        container.remove();
    });

    // Wait a moment for other scripts to load, then apply aggressive overrides
    setTimeout(function() {
        console.log("Override: Applying aggressive function overrides");

        // Override ALL search-related functions aggressively
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

        // Override display functions aggressively
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

        // Override any remaining problematic functions
        window.hideLoadingIndicator = function() {
            console.log("Override: Using update-specific loading indicator management");
            if (typeof window.hideUpdateLoadingIndicator === 'function') {
                window.hideUpdateLoadingIndicator();
            }
        };

        window.updateLoadingMessage = function(message) {
            console.log("Override: Using update-specific loading message");
            if (typeof window.showUpdateLoadingIndicator === 'function') {
                window.showUpdateLoadingIndicator(message);
            }
        };

        console.log("Override: All aggressive overrides applied");
    }, 100);

    // Apply another round of overrides after all scripts have loaded
    setTimeout(function() {
        console.log("Override: Final round of overrides");

        // Ensure the search form uses update search
        const searchForm = document.getElementById('business-search-form');
        if (searchForm) {
            console.log("Override: Ensuring search form uses update search functionality");

            // Remove any existing event listeners
            searchForm.onsubmit = null;

            // Add our own event listener
            searchForm.addEventListener('submit', function(event) {
                event.preventDefault();
                console.log("Override: Search form submitted, using update search");

                const businessName = document.getElementById('business-name')?.value || '';
                const address = document.getElementById('address')?.value || '';

                if (!businessName && !address) {
                    alert("Please enter either a business name or an address to search");
                    return;
                }

                const formData = { businessName, address };

                if (typeof window.performUpdateBusinessSearch === 'function') {
                    window.performUpdateBusinessSearch(formData);
                } else {
                    console.error("Update search function not available");
                }
            });
        }

        console.log("Override: Final initialization complete");
    }, 500);
});