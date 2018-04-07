const koaLogger = require('koa-bunyan-logger');

// const env = process.env.NODE_ENV || 'development'


// var info = {};

module.exports = function logger() {
  return koaLogger({});
};

module.exports.print = function print() {
  return function* middle(next) {
    console.log(this.request);
    yield next;
    console.log(this.response);
  };
};
