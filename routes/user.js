// Application dependencies
const express = require('express');
const userRouter = express.Router();
const Users = require('../models/User');

// route definitions
// Get all Users
userRouter.get('/', getUsers);
// Get a single user
userRouter.get('/:id', getSingleUser);
// Add a new user
userRouter.post('/', addUser);
// Update a single user
userRouter.put('/:id', updateSingleUser);
// Delete a single user
userRouter.delete('/:id', deleteSingleUser);


// Route handlers
async function getUsers (req, res) {
    try {
        const Users = await Users.find();
        res.json({ success: true, data: Users});
    } catch(error) {
        console.log(error);
        res.status(500).json({success: false, message: 'Something went wrong!'});
    }
}
async function getSingleUser(req, res) {
    const id = req.params.id;
    if (!isValidId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    const Users = await Users.findById(id);
    if(!Users) {
        return res.status(404).json({success: false, message: 'Not found!'});
    }
    res.json({ success: true, data: Users});
}
async function addUser(req, res) {
    const title = req.body.title;
    const completed = false;
    const userId = 1; // Change based on user logged in
    // Validate user input before continuing
    if(title) {
        const User = new Users({
            "fname": fname,
            "lname": lname,
            "address1": address1,
            "address2": address2,
            "city": city,
            "state": state,
            "zip": zip,
            "status": userstatus,
            "email": email,
            "password": password,
            "psw_repeat": psw_repeat,
        });
        const savedUsers = await Users.save();
        res.json({success: true, data: savedUsers});
    } else {
        res.status(400).json({ success: false, message: 'All fields are required' });
    }
}

async function updateSingleUser(req, res) {
    const id = req.params.id;
    if (!isValidId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    User = {};
    User.lname = req.body.lname;
    const updatedUsers = await Users.findByIdAndUpdate(id, {$set: Users}, {new: true});
    if(!updatedUsers) {
        return res.status(404).json({success: false, message: 'Not found!'});
    }
    res.json({success: true, data: updatedUsers});

}

function deleteSingleUser(req, res) {
    const User = Users.find((Users) => Users.id === +req.params.id); // + changes string to int
    if(!User) {
        res.status(404).send("Not Found");
    }
    const index = Users.indexOf(User);
    Users.splice(index, 1);
    res.json({success: true});
}

function isValidId(id) {
    if (
        (typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)) ||  // 24-char hex string
        (id instanceof Uint8Array && id.length === 12) ||           // 12-byte Uint8Array
        (Number.isInteger(id))                                      // Integer
    ) {
        return true;
    }
    return false;
}

module.exports = userRouter;