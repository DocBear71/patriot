const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    fname: String,
    lname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    status: String,
    email: String,
    password: String,
    psw_repeat: String,
});

const Users = mongoose.model('Users', schema);

module.exports = Users;