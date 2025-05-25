// terms-debugger.js - Add this temporarily to debug terms acceptance issues

(function() {
    console.log("=== TERMS ACCEPTANCE DEBUGGER ===");

    // Function to check and display current session state
    function debugTermsStatus() {
        console.log("\n--- Terms Acceptance Debug Info ---");

        const sessionData = localStorage.getItem('patriotThanksSession');
        console.log("1. Session data exists:", !!sessionData);

        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                console.log("2. Session parsed successfully:", true);
                console.log("3. User exists in session:", !!session.user);

                if (session.user) {
                    console.log("4. User email:", session.user.email);
                    console.log("5. User terms accepted:", session.user.termsAccepted);
                    console.log("6. User terms version:", session.user.termsVersion);
                    console.log("7. User terms accepted date:", session.user.termsAcceptedDate);

                    const currentVersion = "May 14, 2025";
                    console.log("8. Current terms version:", currentVersion);
                    console.log("9. Versions match:", session.user.termsVersion === currentVersion);
                    console.log("10. Should show modal:", !session.user.termsAccepted || session.user.termsVersion !== currentVersion);

                    // Check for any undefined/null values that might cause issues
                    console.log("\n--- Potential Issues ---");
                    if (session.user.termsAccepted === undefined) console.log("⚠️  termsAccepted is undefined");
                    if (session.user.termsAccepted === null) console.log("⚠️  termsAccepted is null");
                    if (session.user.termsVersion === undefined) console.log("⚠️  termsVersion is undefined");
                    if (session.user.termsVersion === null) console.log("⚠️  termsVersion is null");
                    if (session.user.termsAcceptedDate === undefined) console.log("⚠️  termsAcceptedDate is undefined");
                    if (session.user.termsAcceptedDate === null) console.log("⚠️  termsAcceptedDate is null");
                }
            } catch (error) {
                console.error("Failed to parse session:", error);
            }
        }

        console.log("--- End Debug Info ---\n");
    }

    // Function to fix corrupted session data
    function fixSessionData() {
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            console.log("No session data to fix");
            return;
        }

        try {
            const session = JSON.parse(sessionData);
            if (session.user) {
                let fixed = false;

                // Fix missing or incorrect terms data
                if (session.user.termsAccepted === undefined || session.user.termsAccepted === null) {
                    console.log("Fixing undefined termsAccepted");
                    session.user.termsAccepted = true; // Assume existing users had accepted
                    fixed = true;
                }

                if (!session.user.termsVersion || session.user.termsVersion !== "May 14, 2025") {
                    console.log("Fixing termsVersion to current version");
                    session.user.termsVersion = "May 14, 2025";
                    session.user.termsAcceptedDate = new Date().toISOString();
                    fixed = true;
                }

                if (fixed) {
                    localStorage.setItem('patriotThanksSession', JSON.stringify(session));
                    console.log("✅ Session data fixed and saved");
                    debugTermsStatus(); // Show the fixed data
                } else {
                    console.log("No fixes needed");
                }
            }
        } catch (error) {
            console.error("Error fixing session data:", error);
        }
    }

    // Function to manually set terms acceptance (for testing)
    function setTermsAccepted() {
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            console.log("No session found - cannot set terms acceptance");
            return;
        }

        try {
            const session = JSON.parse(sessionData);
            if (session.user) {
                session.user.termsAccepted = true;
                session.user.termsVersion = "May 14, 2025";
                session.user.termsAcceptedDate = new Date().toISOString();

                localStorage.setItem('patriotThanksSession', JSON.stringify(session));
                console.log("✅ Terms acceptance manually set");
                debugTermsStatus();
            }
        } catch (error) {
            console.error("Error setting terms acceptance:", error);
        }
    }

    // Function to clear terms acceptance (for testing)
    function clearTermsAcceptance() {
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            console.log("No session found");
            return;
        }

        try {
            const session = JSON.parse(sessionData);
            if (session.user) {
                session.user.termsAccepted = false;
                session.user.termsVersion = undefined;
                session.user.termsAcceptedDate = undefined;

                localStorage.setItem('patriotThanksSession', JSON.stringify(session));
                console.log("⚠️  Terms acceptance cleared (for testing)");
                debugTermsStatus();
            }
        } catch (error) {
            console.error("Error clearing terms acceptance:", error);
        }
    }

    // Expose functions to browser console for manual debugging
    window.TermsDebugger = {
        debug: debugTermsStatus,
        fix: fixSessionData,
        setAccepted: setTermsAccepted,
        clearAccepted: clearTermsAcceptance
    };

    // Run initial debug on page load
    setTimeout(debugTermsStatus, 1000);

    console.log("=== TERMS DEBUGGER READY ===");
    console.log("Available commands:");
    console.log("- TermsDebugger.debug() - Show current terms status");
    console.log("- TermsDebugger.fix() - Try to fix corrupted session data");
    console.log("- TermsDebugger.setAccepted() - Manually set terms as accepted");
    console.log("- TermsDebugger.clearAccepted() - Clear terms acceptance (for testing)");
    console.log("================================");

})();