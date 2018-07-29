/**
 * Created by gaojie on 2017/3/15.
 */
const debug = require('debug')('app:debug');
const mysql = require('mysql');
const config = require('../config');


function Mysql(dbConfig) {
  this.connect = mysql.createPool(dbConfig);
}
Mysql.prototype.instance = function instance() {
  return this.connect;
};
Mysql.prototype.escape = function escape(string) {
  return this.connect.escape(string);
};
Mysql.prototype.promise = function promise(sql, connect) {
  const self = this;
  const instance = connect || self.instance();
  debug(sql);
  return new Promise((resolve, reject) => {
    instance.query(sql, (err, result, fields) => {
      if (err) reject(err);
      else {
        resolve(result, fields);
      }
    });
  });
};
Mysql.prototype.transactions = function transactions(cb) {
  const self = this;
  let instance = null;
  return new Promise((resolve, reject) => {
    self.instance().getConnection((err, connect) => {
      if (err) {
        // console.log('reject');
        reject(err);
      } else {
        instance = connect;
        instance.beginTransaction((e) => {
          if (e) {
            reject(e);
          } else if (config.debug) debug('mysql start transaction');
          return resolve(connect);
        });
      }
    });
  }).then(cb).then((result) => {
    return new Promise((resolve, reject) => {
      instance.commit((err) => {
        debug('mysql commit');
        if (err) {
          reject(err);
        } else {
          self.instance().releaseConnection(instance);
          resolve(result);
        }
      });
    });
  }).catch((err) => {
    instance.rollback(() => {
      debug('mysql rollback');
      self.instance().releaseConnection(instance);
    });
    throw err;
  });
};

Mysql.prototype.transaction = function transaction() {
  const self = this;
  return new Promise((resolve, reject) => {
    self.instance().getConnection((err, connect) => {
      if (err) {
        reject(err);
      } else {
        connect.beginTransaction((e) => {
          if (e) return reject(e);
          debug('mysql start transaction');
          return resolve(connect);
        });
      }
    });
  });
};
Mysql.prototype.commit = function commit(connect) {
  const self = this;
  return new Promise((resolve, reject) => {
    connect.commit((err) => {
      if (config.debug) debug('mysql commit');
      if (err) {
        reject(err);
      } else {
        self.instance().releaseConnection(connect);
        resolve();
      }
    });
  });
};
Mysql.prototype.rollback = function rollback(connect) {
  const self = this;
  return new Promise((resolve, reject) => {
    connect.rollback((err) => {
      if (config.debug) debug('mysql rollback');
      if (err) {
        reject(err);
      } else {
        self.instance().releaseConnection(connect);
        resolve();
      }
    });
  });
};
const mysqlInstance = new Mysql(config.mysql);
module.exports = mysqlInstance;
module.exports.Mysql = Mysql;
