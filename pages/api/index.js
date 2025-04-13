module.exports = function(req, res) {
    res.status(200).json({
        message: 'API is working!',
        method: req.method,
        path: req.url
    });
}