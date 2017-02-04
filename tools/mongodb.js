var mongoose = require('mongoose')
var config = require('./config')

var mongodb = mongoose.connect(`mongodb://localhost:${config.mogodb_port}/`)

module.exports = mongodb
