// api/geocode.js
const { geocodeAddress } = require('../utils/geocoding');

/**
 * @route   GET /api/geocode
 * @desc    Geocode an address and return coordinates
 * @access  Public
 */
module.exports = async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({
                success: false,
                message: 'Address parameter is required'
            });
        }

        const location = await geocodeAddress(address);

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Could not geocode the provided address'
            });
        }

        return res.json({
            success: true,
            location
        });
    } catch (error) {
        console.error('Server geocode error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while geocoding address',
            error: error.message
        });
    }
};
