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
      resolve(result, fields);
    });
  });
};
Mysql.prototype.transactions = function transactions(cb) {
  const self = this;
  let instance = null;
  return new Promise((resolve, reject) => {
    self.instance().getConnection((err, connect) => {
      if (err) return reject(err);
      instance = connect;
      return instance.beginTransaction((e) => {
        if (e) return reject(e);
        if (config.debug) debug('mysql start transaction');
        return resolve(connect);
      });
    });
  }).then(cb).then((result) => {
    return new Promise((resolve, reject) => {
      instance.commit((err) => {
        if (err) return reject(err);
        if (config.debug) debug('mysql commit');
        self.instance().releaseConnection(instance);
        return resolve(result);
      });
    });
  }).catch((err) => {
    instance.rollback(() => {
      if (config.debug) debug('mysql rollback');
      self.instance().releaseConnection(instance);
    });
    throw err;
  });
};

Mysql.prototype.transaction = function transaction() {
  const self = this;
  return new Promise((resolve, reject) => {
    self.instance().getConnection((err, connect) => {
      if (err) return reject(err);
      return connect.beginTransaction((e) => {
        if (e) return reject(e);
        if (config.debug) debug('mysql start transaction');
        return resolve(connect);
      });
    });
  });
};
Mysql.prototype.commit = function commit(connect) {
  const self = this;
  return new Promise((resolve, reject) => {
    connect.commit((err) => {
      if (config.debug) debug('mysql commit');
      if (err) return reject(err);
      self.instance().releaseConnection(connect);
      return resolve();
    });
  });
};
Mysql.prototype.rollback = function rollback(connect) {
  const self = this;
  return new Promise((resolve, reject) => {
    connect.rollback((err) => {
      if (config.debug) debug('mysql rollback');
      if (err) return reject(err);
      self.instance().releaseConnection(connect);
      return resolve();
    });
  });
};
const mysqlInstance = new Mysql(config.mysql);
module.exports = mysqlInstance;
module.exports.Mysql = Mysql;
