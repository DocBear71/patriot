// api/register.js - User registration endpoint
const connect = require('../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    status: String,
    level: String,
    email: String,
    password: String,
    isAdmin: Boolean,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// create the model if they don't already exist
let User;
try {
    // try to fetch the existing model
    User = mongoose.model('User');
} catch (error) {
    // define the model if it doesn't exist
    User = mongoose.model('User', userSchema, 'users');
}

module.exports = async (req, res) => {
    // CORS enabled thorugh next.config.js

    // handle Options request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // handle GET reqests for testing
    if (req.method === 'GET') {
        return res.status(200).json({message: 'User registration API is available.'});
    }

    // only allow POST requests for actual operations
    if (req.method !== 'POST') {
        return res.status(405).json({message: 'Method Not Allowed'});
    }

    try {
        console.log("User add API hit:", req.method);
        console.log("Request body:", req.body);

        const userData = req.body;

        // connect to MongoDB using mongoose
        await connect();
        console.log("Connected to MongoDB using Mongoose");

        // Basic validation
        if (!userData.email || (!userData.password && !userData.psw)) {
            return res.status(400).json({message: 'Email and password are required'});
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            return res.status(409).json({message: 'User with this email already exists'});
        }

        // add timestamp fields
        userData.created_at = new Date();
        userData.updated_at = new Date();

        // check if Admin level and set isAdmin flag
        if (userData.level === 'Admin') {
            userData.isAdmin = true;
        }

        // Remove password repeat field before storing
        if (userData.psw_repeat) delete userData.psw_repeat;

        // Rename password field if necessary
        if (userData.psw && !userData.password) {
            userData.password = userData.psw;
            delete userData.psw;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;

        console.log("Inserting user data...");
        // Insert user data using mongoose
        const newUser = new User(userData);
        const result = await newUser.save();
        console.log("User inserted successfully:", result._id);

        // Return success response
        return res.status(201).json({
            message: 'User registered successfully',
            userId: result._id
        });
    } catch (error) {
        console.error('User creation failed:', error);
        return res.status(500).json({message: 'Server error during user creation: ' + error.message});

    }
};
