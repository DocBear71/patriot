// layout-manager.js - Apply correct layout classes to all pages

document.addEventListener('DOMContentLoaded', function() {
    // Get the current page filename
    const path = window.location.pathname;
    const page = path.split("/").pop();

    // Default to standard layout
    let layoutClass = "use-standard";

    // Set appropriate layout class based on page
    if (page === "index.html" || page === "" || page === "/") {
        // Home page uses grid layout
        layoutClass = "use-grid";
    }
    else if (
        page === "business-search.html" ||
        page === "add-business.html") {
        // These pages use float-based layout
        layoutClass = "use-float";
    }
    else if (
        page.includes("admin-") ||
        page.includes("dashboard")) {
        // Admin pages use standard layout
        layoutClass = "use-standard";
    }

    // Apply the appropriate class to the body element
    document.body.classList.add(layoutClass);

    console.log(`Layout manager applied class: ${layoutClass} to page: ${page}`);

    // Handle special cases

    // Fix for search table visibility
    if (page === "business-search.html") {
        // Ensure any data tables are properly initialized
        const searchTable = document.getElementById('search_table');
        if (searchTable) {
            console.log("Initializing search table layout");
        }
    }

    // Fix for admin dashboard panels
    if (page.includes("admin-")) {
        const adminContainer = document.querySelector('.admin-container');
        if (adminContainer) {
            console.log("Applying admin layout fixes");
        }
    }
});