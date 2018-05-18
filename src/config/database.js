// const fs = require('fs');
const config = require('./');

module.exports = {
  development: {
    username: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    host: config.mysql.host,
    dialect: 'mysql',
  },
  test: {
    username: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    host: config.mysql.host,
    dialect: 'mysql',
  },
  production: {
    username: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    host: config.mysql.host,
    dialect: 'mysql',
    // dialectOptions: {
    //   ssl: {
    //     ca: fs.readFileSync(__dirname + '/mysql-ca-master.crt')
    //   }
    // }
  },
};
