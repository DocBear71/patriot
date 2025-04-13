// pages/api/test.js
module.exports = function(req, res) {
    // Log the request for debugging
    console.log("Test API hit:", req.method);

    // Send a simple response
    res.status(200).json({
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
}