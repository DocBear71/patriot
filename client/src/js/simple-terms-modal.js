// simple-terms-modal.js - A clean, standalone modal implementation

(function() {
    console.log("Simple Terms Modal System loaded");

    // Skip showing modal on terms and privacy pages themselves
    // Check if we're on a terms or privacy page
    const currentPath = window.location.pathname.toLowerCase();
    const isTermsPage = currentPath.includes('terms') || currentPath.includes('privacy');

    // If on terms/privacy page, don't set up the modal
    if (isTermsPage) {
        console.log("On terms/privacy page - disabling terms modal");

        // Override any existing modal functions to prevent them from running
        window.checkTermsVersion = function() {
            console.log("Terms check disabled on terms/privacy pages");
        };

        window.updateTermsAcceptance = function() {
            console.log("Terms acceptance disabled on terms/privacy pages");
        };

        // Exit early - don't set up the modal
        if (typeof window.SimpleTermsModal === 'undefined') {
            window.SimpleTermsModal = {
                show: function() { console.log("Modal disabled on terms pages"); },
                hide: function() { console.log("Modal disabled on terms pages"); },
                check: function() { console.log("Modal disabled on terms pages"); }
            };
        }

        // Exit the script early
        return;
    }

    // Modal HTML template - no dependencies on Bootstrap
    const modalTemplate = `
    <div id="simpleTermsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 9999; overflow: auto;">
      <div style="background-color: white; border-radius: 8px; padding: 20px; width: 90%; max-width: 600px; margin: 50px auto; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <h2 style="margin-top: 0;">Terms of Use Update</h2>
        <p>Our Terms of Use have been updated. Please review and accept the new terms to continue using our services.</p>
        
        <div style="text-align: center; margin: 15px 0;">
          <a href="/terms.html" target="_blank" style="display: inline-block; background-color: #007bff; color: white; padding: 8px 16px; margin: 0 5px; text-decoration: none; border-radius: 4px;">Read Full Terms</a>
          <a href="/privacy.html" target="_blank" style="display: inline-block; background-color: #007bff; color: white; padding: 8px 16px; margin: 0 5px; text-decoration: none; border-radius: 4px;">Read Privacy Policy</a>
        </div>
        
        <div id="simpleTermsSummary" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; margin: 15px 0; background-color: #f9f9f9;">
          <h3>Summary of Key Terms</h3>
          <p><strong>Effective Date:</strong> May 14, 2025</p>
          
          <h4 style="margin-top: 15px;">1. ACCEPTANCE OF TERMS</h4>
          <p>By accessing or using Patriot Thanks, you agree to be bound by these Terms of Use. If you do not agree to these terms, you must discontinue use immediately.</p>
          
          <h4 style="margin-top: 15px;">2. INTELLECTUAL PROPERTY RIGHTS</h4>
          <p>All content, features, and functionality on Patriot Thanks are owned by Doc Bear Enterprises, LLC and are protected by copyright, trademark, and other intellectual property laws.</p>
          
          <h4 style="margin-top: 15px;">3. USER RESPONSIBILITIES</h4>
          <p>Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account.</p>
          
          <h4 style="margin-top: 15px;">4. DATA COLLECTION AND PRIVACY</h4>
          <p>We collect certain personal information to provide our services. Your use of Patriot Thanks is also governed by our Privacy Policy.</p>
          
          <h4 style="margin-top: 15px;">5. LIMITATION OF LIABILITY</h4>
          <p>Patriot Thanks and its owners will not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
          
          <h4 style="margin-top: 15px;">6. DISPUTE RESOLUTION</h4>
          <p>Any disputes arising from your use of the service will be governed by the laws of Iowa.</p>
          
          <h4 style="margin-top: 15px;">7. MODIFICATION OF TERMS</h4>
          <p>We reserve the right to modify these terms at any time. Continued use of Patriot Thanks after such modifications constitutes acceptance of the updated terms.</p>
          
          <div id="termsScrollTarget">
            <p>Thank you for reviewing our Terms of Use summary. Please check the box below to indicate your acceptance.</p>
          </div>
        </div>
        
        <div id="scrollMessageSimple" style="display: none; color: green; margin: 10px 0; text-align: center;">
          <span style="margin-right: 5px;">✓</span> You've reviewed the terms. Please check the box below to confirm your acceptance.
        </div>
        
        <div style="margin: 15px 0;">
          <div style="display: flex; align-items: flex-start;">
            <input type="checkbox" id="acceptTermsCheckbox" disabled style="margin-right: 10px; margin-top: 3px;"> 
            <label for="acceptTermsCheckbox" style="cursor: pointer; display: inline; line-height: 1.5;">
              I have read and agree to the updated <a href="/terms.html" target="_blank">Terms of Use</a> and <a href="/privacy.html" target="_blank">Privacy Policy</a>
            </label>
          </div>
        </div>
        
        <div style="display: flex; margin-top: 20px; justify-content: space-between;">
          <button id="declineTermsBtn" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Decline</button>
          <button id="acceptTermsBtn" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;" disabled>Accept Terms</button>
        </div>
      </div>
    </div>
    `;

    // Terms version
    const CURRENT_TERMS_VERSION = "May 14, 2025";

    // Create the modal once
    function createModal() {
        // Check if modal already exists
        if (document.getElementById('simpleTermsModal')) {
            return;
        }

        // Create modal element
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalTemplate;
        document.body.appendChild(modalContainer.firstElementChild);

        // Get elements
        const modal = document.getElementById('simpleTermsModal');
        const summary = document.getElementById('simpleTermsSummary');
        const checkbox = document.getElementById('acceptTermsCheckbox');
        const acceptBtn = document.getElementById('acceptTermsBtn');
        const declineBtn = document.getElementById('declineTermsBtn');
        const scrollMsg = document.getElementById('scrollMessageSimple');

        // Set up scroll tracking
        let hasScrolled = false;
        summary.addEventListener('scroll', function() {
            // Calculate scroll position
            const scrollPosition = summary.scrollTop + summary.clientHeight;
            const scrollHeight = summary.scrollHeight;

            // Check if user has scrolled to bottom
            if (scrollPosition >= scrollHeight - 30) {
                hasScrolled = true;
                checkbox.disabled = false;
                scrollMsg.style.display = 'block';
            }
        });

        // Set up checkbox
        checkbox.addEventListener('change', function() {
            acceptBtn.disabled = !this.checked;
        });

        // Set up accept button
        acceptBtn.addEventListener('click', function() {
            acceptTerms();
            hideModal();
        });

        // Set up decline button
        declineBtn.addEventListener('click', function() {
            if (confirm("If you do not accept the updated terms, you will be logged out and unable to use the service. Continue?")) {
                logout();
                hideModal();
            }
        });
    }

    // Show the modal
    function showModal() {
        createModal();
        const modal = document.getElementById('simpleTermsModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
    }

    // Hide the modal
    function hideModal() {
        const modal = document.getElementById('simpleTermsModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    // Accept terms function
    function acceptTerms() {
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            console.error("No session found");
            return;
        }

        try {
            const session = JSON.parse(sessionData);

            // Update locally
            session.user.termsAccepted = true;
            session.user.termsAcceptedDate = new Date().toISOString();
            session.user.termsVersion = CURRENT_TERMS_VERSION;
            localStorage.setItem('patriotThanksSession', JSON.stringify(session));

            console.log("Terms accepted locally");

            // Update on server
            const baseURL = window.location.hostname === "localhost" || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;

            fetch(`${baseURL}/api/auth.js?operation=update-terms-acceptance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + session.token
                },
                body: JSON.stringify({
                    userId: session.user._id,
                    termsAccepted: true,
                    termsAcceptedDate: new Date().toISOString(),
                    termsVersion: CURRENT_TERMS_VERSION
                })
            })
                .then(response => response.json())
                .then(data => {
                    console.log("Terms acceptance updated on server");
                })
                .catch(error => {
                    console.error("Error updating terms on server:", error);
                    // Already updated locally, so no need to show error
                });
        } catch (error) {
            console.error("Error parsing session:", error);
        }
    }

    // Logout function
    function logout() {
        localStorage.removeItem('patriotThanksSession');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        location.reload();
    }

    // Check if user needs to accept terms
    function checkTermsAcceptance() {
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            return;
        }

        try {
            const session = JSON.parse(sessionData);
            if (!session.user || !session.user.termsAccepted || session.user.termsVersion !== CURRENT_TERMS_VERSION) {
                console.log("User needs to accept terms");
                showModal();
            }
        } catch (error) {
            console.error("Error checking terms acceptance:", error);
        }
    }

    // Check terms after a delay to ensure other scripts are loaded
    setTimeout(checkTermsAcceptance, 1000);

    // Expose functions globally
    window.SimpleTermsModal = {
        show: showModal,
        hide: hideModal,
        check: checkTermsAcceptance,
        accept: acceptTerms
    };
})();