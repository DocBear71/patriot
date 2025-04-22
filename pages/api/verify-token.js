// api/verify-token.js - Simplified for debugging
module.exports = (req, res) => {
    console.log("Verify-token endpoint called");

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(200).end();
    }

    // Get the token from header but don't validate it yet
    const authHeader = req.headers.authorization;

    // Log the request details for debugging
    console.log("Request method:", req.method);
    console.log("Authorization header present:", !!authHeader);

    // Return a success response for testing
    return res.status(200).json({
        isValid: true,
        userId: "test-user-id",
        isAdmin: true,
        level: "Admin",
        name: "Test Admin User"
    });
};