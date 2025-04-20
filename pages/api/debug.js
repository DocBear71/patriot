// debug.js - file to test API connectivity

// This is a simplified version to test if the API can respond at all
module.exports = async (req, res) => {
    // Log request details to help debugging
    console.log("Debug API hit:", req.method);
    console.log("Query params:", req.query);
    console.log("Request body:", req.body);

    // Return a simple success response
    return res.status(200).json({
        message: 'Debug API is working',
        query: req.query,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};