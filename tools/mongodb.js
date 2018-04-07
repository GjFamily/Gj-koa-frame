const mongoose = require('mongoose');
const config = require('../config');

const mongodb = mongoose.connect(`mongodb://localhost:${config.mogodb_port}/`);

module.exports = mongodb;
