document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    function isLoggedIn() {
        return localStorage.getItem('userToken') !== null;
    }

    // Get user's membership level
    function getUserLevel() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        return userData.level || 'Free';
    }

    // Check if a feature requires premium
    function isPremiumFeature(featureId) {
        // Define premium features with their required level
        const premiumFeatures = {
            'advanced-search': 'Basic',
            'business-analytics': 'Premium',
            'export-data': 'Premium',
            'saved-searches': 'Basic',
            'map-view': 'Basic',
            'favorites': 'Free', // Allow this for all users
            'business-submit': 'Free', // Allow this for all users
            'detailed-view': 'Basic',
            'filter-options': 'Basic'
        };

        return premiumFeatures[featureId] || false;
    }

    // Check if user has access to feature
    function hasAccessToFeature(featureId) {
        if (!isPremiumFeature(featureId)) return true;

        const userLevel = getUserLevel();
        const requiredLevel = isPremiumFeature(featureId);

        // Access level hierarchy
        const levels = ['Free', 'Basic', 'Premium', 'VIP', 'Admin'];

        // Check if user level is sufficient
        return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
    }

    // Show premium feature message
    function showPremiumFeatureMessage(featureId, feature) {
        const requiredLevel = isPremiumFeature(featureId);

        // Create premium message element
        const messageContainer = document.createElement('div');
        messageContainer.className = 'premium-feature-message';
        messageContainer.innerHTML = `
            <div class="premium-message-content">
                <h4>Premium Feature</h4>
                <p>This ${feature || 'feature'} requires a ${requiredLevel} membership.</p>
                <p>We're currently working on implementing premium memberships. For now, you can support us through donations!</p>
                <div class="premium-buttons">
                    <a href="donate.html" class="btn btn-primary">Support Us</a>
                    <button class="btn btn-secondary close-premium-message">Close</button>
                </div>
            </div>
        `;

        // Add styles
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '0';
        messageContainer.style.left = '0';
        messageContainer.style.right = '0';
        messageContainer.style.bottom = '0';
        messageContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageContainer.style.zIndex = '9999';
        messageContainer.style.display = 'flex';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.justifyContent = 'center';

        // Style the content
        const content = messageContainer.querySelector('.premium-message-content');
        content.style.backgroundColor = '#fff';
        content.style.padding = '20px';
        content.style.borderRadius = '5px';
        content.style.maxWidth = '400px';
        content.style.textAlign = 'center';

        // Add to document
        document.body.appendChild(messageContainer);

        // Add close button event
        const closeButton = messageContainer.querySelector('.close-premium-message');
        closeButton.addEventListener('click', function() {
            messageContainer.remove();
        });
    }

    // Add premium feature checks to buttons and links
    function addPremiumFeatureChecks() {
        // Find all elements with data-premium-feature attribute
        const premiumElements = document.querySelectorAll('[data-premium-feature]');

        premiumElements.forEach(element => {
            const featureId = element.getAttribute('data-premium-feature');
            const featureName = element.getAttribute('data-feature-name') || 'feature';

            // Check if premium is implemented yet
            const premiumActive = false; // Set to true when premium features are implemented

            if (!premiumActive) {
                // If premium not active yet, just show a message when clicked
                element.addEventListener('click', function(e) {
                    e.preventDefault();
                    showPremiumFeatureMessage(featureId, featureName);
                });
            } else {
                // Normal premium check when implemented
                if (!hasAccessToFeature(featureId)) {
                    element.addEventListener('click', function(e) {
                        e.preventDefault();
                        showPremiumFeatureMessage(featureId, featureName);
                    });
                }
            }
        });
    }

    // Add "Coming Soon" badges to premium features in menus
    function addComingSoonBadges() {
        const menuItems = document.querySelectorAll('.nav-item[data-premium-feature]');

        menuItems.forEach(item => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-warning text-dark ms-2';
            badge.textContent = 'Coming Soon';

            // Insert the badge next to the menu text
            const menuLink = item.querySelector('.nav-link');
            if (menuLink) {
                menuLink.appendChild(badge);
            }
        });
    }

    // Initialize
    addPremiumFeatureChecks();
    addComingSoonBadges();

    // Expose functions for use in other scripts
    window.premiumFeatures = {
        isLoggedIn,
        getUserLevel,
        hasAccessToFeature,
        showPremiumFeatureMessage
    };
});