// api/test-endpoint.js
module.exports = (req, res) => {
    console.log("Test endpoint called");
    res.status(200).json({
        success: true,
        message: "API routing is working correctly"
    });
};