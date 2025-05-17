// Simple Modal Checker

$(document).ready(function() {
    console.log("Simple Modal Checker loaded");

    // Wait a moment for everything to load
    setTimeout(function() {
        // Check if user is logged in
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            console.log("No session data - not checking terms");
            return;
        }

        try {
            // Parse session and check terms
            const session = JSON.parse(sessionData);

            // Current version of terms
            const currentTermsVersion = "May 14, 2025";

            // Check if user has accepted current terms
            if (!session.user.termsAccepted || session.user.termsVersion !== currentTermsVersion) {
                console.log("DIRECT CHECK: User needs to accept terms");

                // Show a simple dialog to accept terms - completely separate from Bootstrap Modal
                showSimpleTermsDialog(session);
            } else {
                console.log("DIRECT CHECK: User has already accepted terms");
            }
        } catch (e) {
            console.error("Error checking terms:", e);
        }
    }, 1000);

    // Function to show a simple terms dialog
    function showSimpleTermsDialog(session) {
        // Create an overlay div
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        // Create dialog div
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = 'white';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.width = '90%';
        dialog.style.maxWidth = '600px';
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';
        dialog.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';

        // Add content
        dialog.innerHTML = `
      <h2 style="margin-top: 0;">Terms of Use Update</h2>
      <p>Our Terms of Use have been updated. Please review and accept the new terms to continue using our services.</p>
      
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; margin: 15px 0; background-color: #f9f9f9;">
        <h4>Summary of Key Terms</h4>
        <p><strong>Effective Date:</strong> May 14, 2025</p>
        
        <h5 style="margin-top: 15px;">1. ACCEPTANCE OF TERMS</h5>
        <p>By accessing or using Patriot Thanks, you agree to be bound by these Terms of Use.</p>
        
        <h5 style="margin-top: 15px;">2. INTELLECTUAL PROPERTY RIGHTS</h5>
        <p>All content, features, and functionality on Patriot Thanks are owned by Doc Bear Enterprises, LLC.</p>
        
        <h5 style="margin-top: 15px;">3. USER RESPONSIBILITIES</h5>
        <p>Users are responsible for maintaining the confidentiality of their account information.</p>
        
        <h5 style="margin-top: 15px;">4. DATA COLLECTION AND PRIVACY</h5>
        <p>We collect certain personal information to provide our services.</p>
        
        <h5 style="margin-top: 15px;">5. LIMITATION OF LIABILITY</h5>
        <p>Patriot Thanks and its owners will not be liable for any indirect, incidental, special, or consequential damages.</p>
      </div>
      
      <div style="display: flex; margin-top: 20px; justify-content: space-between;">
        <button id="simpleAccept" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Accept Terms</button>
        <button id="simpleDecline" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Decline</button>
      </div>
    `;

        // Add dialog to overlay
        overlay.appendChild(dialog);

        // Add overlay to body
        document.body.appendChild(overlay);

        // Set up button handlers
        document.getElementById('simpleAccept').addEventListener('click', function() {
            console.log("Simple accept clicked");

            // Update session data
            session.user.termsAccepted = true;
            session.user.termsAcceptedDate = new Date().toISOString();
            session.user.termsVersion = "May 14, 2025";
            localStorage.setItem('patriotThanksSession', JSON.stringify(session));

            // Remove overlay
            document.body.removeChild(overlay);

            // Try to update on server if possible
            updateTermsOnServer(session);
        });

        document.getElementById('simpleDecline').addEventListener('click', function() {
            console.log("Simple decline clicked");

            // Confirm logout
            if (confirm("If you do not accept the updated terms, you will be logged out and unable to use the service. Continue?")) {
                // Log out - remove session
                localStorage.removeItem('patriotThanksSession');
                localStorage.removeItem('isLoggedIn');

                // Remove overlay
                document.body.removeChild(overlay);

                // Reload the page
                location.reload();
            }
        });
    }

    // Function to update terms on server
    function updateTermsOnServer(session) {
        const userId = session.user._id;
        const token = session.token;

        // determine the base URL
        const baseURL = window.location.hostname === "localhost" || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.host}`
            : window.location.origin;

        // Update user's terms acceptance
        fetch(`${baseURL}/api/auth.js?operation=update-terms-acceptance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                userId: userId,
                termsAccepted: true,
                termsAcceptedDate: new Date().toISOString(),
                termsVersion: "May 14, 2025"
            })
        })
            .then(response => response.json())
            .then(data => {
                console.log("Terms acceptance updated on server successfully");
            })
            .catch(error => {
                console.error('Error updating terms on server:', error);
                // Already updated locally, so no need to show an error
            });
    }
});