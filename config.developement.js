/* eslint-disable */

let local = {};
try {
  local = require('../config.' + NODE_ENV);
} catch (e) {
  try {
    local = require('../config');
  } catch (ee) {
    local = {};
  }
}
module.exports = Object.assign({
  server_port: 8000,
  host: 'http://127.0.0.1:8000',
  debug: true,
  mysql: {
    host: '127.0.0.1',
    port: 3306,
    user: 'huoxing',
    password: 'huoxing',
    database: 'huoxing',
    charset: 'utf8',
  },
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
  cache: {
    expire: 60 * 5,
    token_expire_seconds: 86400 * 30,
  },
  smtp: {
    host: 'smtp.qiye.aliyun.com',
    port: 465,
    secure: true,
    auth: {
      user: 'hello@goto-mars.com',
      pass: 'Thomas-1974'
    }
  },
  upload_path: '../upload/',
  upload_url: '/upload/'
}, local);
