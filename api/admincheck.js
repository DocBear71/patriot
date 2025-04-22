// api/admincheck.js - Simple test endpoint
module.exports = (req, res) => {
    console.log("Admin check test endpoint called");
    res.status(200).json({
        working: true,
        isAdmin: true,
        message: "This is a test endpoint"
    });
};