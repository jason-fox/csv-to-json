const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Device = new Schema({
    id: String,
    unitCode: String
});

module.exports.model = mongoose.model('Device', Device);
