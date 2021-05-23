/* eslint-disable */
const path = require('path');
let local = {};
const NODE_ENV = process.env.NODE_ENV || 'development';
try {
  local = require('../../../config.' + NODE_ENV);
} catch (e) {
  try {
    local = require('../../../config');
  } catch (ee) {
    local = {};
  }
}
const env_config = {
  development: {
    server_port: process.env.PORT || 3000,
    debug: true,
  },
  test: {
    server_port: '',
    debug: true,
    mogodb_port: '',
  },
  production: {
    server_port: '',
    debug: false,
    mogodb_port: '',
  },
};
// ========================================================
// Default Configuration
// ========================================================
const config = Object.assign(env_config[NODE_ENV], local);

module.exports = config;
module.exports.NODE_ENV = NODE_ENV;
module.exports.PROJECT_PATH = path.resolve(__dirname, '../../')
