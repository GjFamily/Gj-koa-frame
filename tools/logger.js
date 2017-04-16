var config = require('../config');
var koa_logger = require('koa-bunyan-logger');

var env = process.env.NODE_ENV || "development"


var info = {};

module.exports = function () {
  return koa_logger({});
};

module.exports.print = function () {
  return function *(next) {
    console.log(this.request);
    yield next;
    console.log(this.response);
  }
}
