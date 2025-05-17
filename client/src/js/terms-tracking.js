// /client/src/js/terms-tracking.js

document.addEventListener('DOMContentLoaded', function() {
    // Only run on terms-of-use.html or privacy-policy.html pages
    if (!window.location.pathname.includes('terms-of-use') &&
        !window.location.pathname.includes('privacy-policy')) {
        return;
    }

    const termsContainer = document.querySelector('.terms-container');
    if (!termsContainer) return;

    // Create tracking variables
    let hasScrolled = false;
    let scrollPercentage = 0;
    let startTime = new Date();
    let timeSpent = 0;

    // Add a hidden field to the page to track scrolling
    const scrollTracker = document.createElement('div');
    scrollTracker.id = 'scroll-tracker';
    scrollTracker.style.display = 'none';
    scrollTracker.setAttribute('data-scrolled', 'false');
    scrollTracker.setAttribute('data-percentage', '0');
    scrollTracker.setAttribute('data-time-spent', '0');
    document.body.appendChild(scrollTracker);

    // Track scrolling
    window.addEventListener('scroll', function() {
        // Calculate how far user has scrolled
        const contentHeight = termsContainer.scrollHeight;
        const visibleHeight = window.innerHeight;
        const scrollTop = window.scrollY;
        const scrollBottom = scrollTop + visibleHeight;

        // Calculate percentage scrolled
        scrollPercentage = Math.min(100, Math.round((scrollBottom / contentHeight) * 100));

        // Update tracker
        hasScrolled = true;
        scrollTracker.setAttribute('data-scrolled', 'true');
        scrollTracker.setAttribute('data-percentage', scrollPercentage.toString());

        // If user has scrolled more than 90%, consider it fully read
        if (scrollPercentage > 90) {
            localStorage.setItem('termsRead', 'true');
            localStorage.setItem('termsReadDate', new Date().toString());
            localStorage.setItem('termsVersion', 'May 14, 2025');
        }
    });

    // Track time spent on the page
    const timeTracker = setInterval(function() {
        timeSpent = Math.round((new Date() - startTime) / 1000);
        scrollTracker.setAttribute('data-time-spent', timeSpent.toString());

        // If user has spent more than 30 seconds, consider it meaningful engagement
        if (timeSpent > 30) {
            localStorage.setItem('termsEngaged', 'true');
        }
    }, 1000);

    // Clean up on page leave
    window.addEventListener('beforeunload', function() {
        clearInterval(timeTracker);
    });
});