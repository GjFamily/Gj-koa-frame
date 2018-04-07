/**
 * Created by gaojie on 2017/3/15.
 */
const util = require('util');
const events = require('events');
const co = require('co');
const mysql = require('../tools/mysql');
// const config = require('../config');

const redis = {}; // require('../tools/redis');

// const MODEL_ORDER_ASC = 'asc';
const MODEL_ORDER_DESC = 'desc';

function Executor(m, r) {
  this.mysql = m;
  this.redis = r;
  this.app = {};
}

function Query(model) {
  this.query = {};
  if (model) {
    this.model = model;
    this.schema = model.schema;
    this.table_name(model.table_name);
    if (this.schema.expire()) {
      this.query.primary = this.schema.getPrimary();
      this.query.index = this.schema.index();
      this.query.expire = this.schema.expire();
    }
  }
}
Query.prototype.table_name = function (table_name) {
  this.query.table_name = table_name;
  return this;
};
Query.prototype.set = function (query) {
  if (query instanceof Query) {
    Object.assign(this.query, query.query);
  } else {
    Object.assign(this.query, query);
  }
  return this;
};
Query.prototype.get = function () {
  return this.query;
};
Query.prototype.limit = function (offset = 0, num = 0) {
  this.query.limit = [offset, num];
  return this;
};
Query.prototype.select = function () {
  this.query.select = true;
  return this;
};
Query.prototype.one = function () {
  this.query.limit = [0, 1];
  return this;
};
Query.prototype.count = function () {
  this.query.field = 'COUNT(*)';
  this.query.count = true;
  this.query.select = true;
  if (!this.query.where || this.query.where.length === 0) this.query.where = '1';
  return this;
};
Query.prototype.order = function (field, d) {
  d = d || MODEL_ORDER_DESC;
  this.query.order = [field, d];
  return this;
};
Query.prototype.all = function () {
  this.query.limit = [];
  return this.select();
};
Query.prototype.field = function (field) {
  this.query.field = field;
  return this;
};
Query.prototype.delete = function () {
  this.query.delete = true;
  return this;
};
Query.prototype.update = function (data) {
  this.query.update = true;
  this.query.value = data;
  return this;
};
Query.prototype.connect = function (connect) {
  this.query.connect = connect;
  return this;
};
Executor.prototype.exec = function (sql, connect) {
  // if(this.app.__MOCK__){
  //   return Promise.resolve(new MockModel(this.mockData, sql).exec(sql));
  // }else{
  return this.mysql.promise(sql, connect);
  // }
};
Executor.prototype.handle = function (query) {
  if (query instanceof Query) query = query.get();
  const executor = this;
  return executor.handle_sql(query);
  // let promise;
  // let key = this.getCacheKey(query);
  // if (key && query.select) {
  //   promise = this.getCache(key);
  // } else {
  //   promise = Promise.resolve(null);
  // }
  // return promise.then((result) => {
  //   if (result !== null) return result;
  //   return executor.handle_sql(query);
  // }).then((result) => {
  //   if ((query.select || query.insert) && key) {
  //     return executor.setCache(key, result, query.expire).then(() => {
  //       return result;
  //     }).catch((err) => {
  //       return result;
  //     });
  //   } else if (key) {
  //     return executor.clearCache(key).then(() => {
  //       return result;
  //     }).catch((err) => {
  //       return result;
  //     });
  //   } else {
  //     return result;
  //   }
  // });
};
Executor.prototype.handle_sql = function (query) {
  let sql = '';
  let error = null;
  if (query.insert) {
    if (!query.value && !query.field) error = '[DB] INSERT SQL value and field not empty';
    const sc = query.replace ? 'REPLACE' : 'INSERT';
    sql = `${sc} INTO ${query.table_name} ${this._addValue(query.value, query.field)}`;
    if (query.update) {
      sql += ` ON DUPLICATE KEY UPDATE ${this._setValue(query.update, query.field)}`;
    }
  } else if (query.select) {
    // if(!query.where) error = "[DB] SELECT SQL where not empty";
    const limit = query.limit ? (query.limit instanceof Array ? `LIMIT ${query.limit[0]}, ${query.limit[1]}` : `LIMIT ${query.limit}`) : '';
    const order = query.order ? (query.order instanceof Array ? `ORDER BY ${query.order[0]} ${query.order[1]}` : `ORDER BY ${query.order}`) : '';
    sql = `SELECT ${this._field(query.field)} FROM ${query.table_name} WHERE ${this._where(query.where)} ${order} ${limit}`;
  } else if (query.update) {
    if (!query.where || !query.value) error = '[DB] UPDATE SQL where or value not empty';
    sql = `UPDATE ${query.table_name} SET ${this._setValue(query.value, query.field)} WHERE ${this._where(query.where)}`;
  } else if (query.delete) {
    if (!query.where) error = '[DB] DELETE SQL where not empty';
    sql = `DELETE FROM ${query.table_name} WHERE ${this._where(query.where)}`;
  } else {
    error = '[DB] SQL TYPE not empty';
  }
  if (error) return Promise.reject(new Error(`${error} ERROR SQL: ${sql}`));
  // if(this.app.__MOCK__){
  // return Promise.resolve(new MockModel(this.mockData, sql)
  // .handle(query)).then((result)=>{return result});
  // }else{
  return this.exec(sql, query.connect).then();
  // }
};
Executor.prototype.getCacheKey = function getCacheKey(query) {
  const key_prefix = `model:cache:${query.table_name}.`;
  // 分析主键
  if (query.primary) {
    if (query.insert) {
      return `${key_prefix}${query.primary}.${query.value}`;
    }
  }
  // 分析索引
  return '';
};
Executor.prototype.getCache = function (key) {
  let promise = null;
  if (key instanceof Array) {
    // 索引走hash表
    promise = this.redis.hget(key[0], key[1]);
  } else {
    promise = this.redis.get(key);
  }
  return promise.then((result) => {
    if (!result) return null;
    return JSON.parse(result);
  });
};
Executor.prototype.setCache = function (key, result, expire) {
  if (!key || !expire) return Promise.reject();
  result = JSON.stringify(result);
  const r = this.redis;
  if (key instanceof Array) {
    // 索引根据查询条件走hash存储
    return r.hset(key[0], key[1], result).then(() => {
      return r.expire(expire);
    });
  } else {
    return r.setex(key, expire, result);
  }
};
Executor.prototype.clearCache = function (key) {
  if (!key) return Promise.reject();
  const r = this.redis;
  // 删除对应索引的所有缓存
  if (key instanceof Array) return r.del(key[0]);
  else return r.del(key);
};
Executor.prototype.count = function (query) {
  if (!(query instanceof Query)) query = new Query().set(query);
  return this.handle(query.count()).then((result) => { return result[0]['COUNT(*)']; });
};
Executor.prototype.startTransaction = function () {
  return this.mysql.transaction();
};
Executor.prototype.commit = function (t) {
  return this.mysql.commit(t);
};
Executor.prototype.rollback = function (t) {
  return this.mysql.rollback(t);
};
Executor.prototype.transactions = function (cb) {
  return this.mysql.transactions((connect) => {
    const query = new Query().connect(connect);
    return co(cb(query));
  });
};
Executor.prototype._v = function (v) {
  // let _v = "''";
  // if(typeof v === "string") {
  //   _v = `'${v}'`;
  // } else if(typeof v === "number") {
  //   _v = v;
  // }
  // return _v;
  return this.mysql.escape(v);
};
Executor.prototype._f = function (f) {
  return `\`${f}\``;
};
Executor.prototype._addValue = function (value, field) {
  const v = [];
  let field_tmp = [];
  if (!(value instanceof Array)) { // && typeof value[0] == Object
    value = [value];
  }
  if (field instanceof Array) {
    field_tmp = field;
  } else {
    for (const i in value[0]) {
      field_tmp.push(i);
    }
  }
  for (const i in value) {
    const row = value[i];
    const tmp = [];
    for (const j in field_tmp) {
      tmp.push(this._v(row[field_tmp[j]]));
    }
    v.push(`(${tmp.join(',')})`);
  }
  for (const i in field_tmp) {
    field_tmp[i] = this._f(field_tmp[i]);
  }
  return `(${field_tmp.join(',')}) VALUES ${v.join(',')}`;
};
Executor.prototype._setValue = function (value, field) {
  const tmp = [];
  if (field instanceof Array) {
    for (const i in field) {
      if (value[field[i]] !== 'undefined') continue;
      let v = value[field[i]];
      let op = '=';
      if (v instanceof Array) {
        const [a, b] = v;
        op = a;
        if (op === '+=') op = `=${this._f(field[i])} + `;
        else if (op === '-=') op = `=${this._f(field[i])} - `;
        v = b;
      }
      tmp.push(`${this._f(field[i])}${op}${this._v(v)}`);
    }
  } else {
    for (const i in value) {
      let v = value[i];
      let op = '=';
      if (v instanceof Array) {
        const [a, b] = v;
        op = a;
        if (op === '+=') op = `=${this._f(i)} + `;
        else if (op === '-=') op = `=${this._f(i)} - `;
        v = b;
      }
      tmp.push(`${this._f(i)}${op}${this._v(v)}`);
    }
  }
  return tmp.join(',');
};
Executor.prototype._field = function (field) {
  if (field instanceof Array) {
    for (const i in field) {
      field[i] = this._f(field[i]);
    }
    return field.join(',');
  } else if (typeof (field) === 'string' && field) {
    return field;
  } else {
    return '*';
  }
};
Executor.prototype._where = function (where) {
  const tmp = [];
  if (!where || where.length === 0) tmp.push('1');
  for (const i in where) {
    if (typeof where[i] === 'string') {
      tmp.push(where[i]);
    } else if (typeof where[i] === 'object') {
      if (where[i][1] === 'in') {
        tmp.push(`${this._f(where[i][0])} ${where[i][1]} (${where[i][2].join(',')})`);
      } else if (where[i][1] === 'like') {
        tmp.push(`${this._f(where[i][0])} ${where[i][1]} (%${where[i][2]}%)`);
      } else {
        tmp.push(`${this._f(where[i][0])} ${where[i][1]} ${this._v(where[i][2])}`);
      }
    }
  }
  return tmp.join(' AND ');
};
const executor = new Executor(mysql, redis);

function Record(model) {
  const { schema } = model;
  const keys = schema.fields();
  const instance = function (data, is_new = true) {
    this.__data = {};
    this.__change = {};
    if (data) this.__data = data;
    this.__is_new = is_new;
    if (this.__is_new) {
      for (const i in keys) {
        const field = keys[i];
        if (this.__data[field] === undefined) {
          this.__data[field] = schema.default[field] === undefined ? '' : schema.default[field];
        }
      }
    }
  };
  instance.prototype.getSchema = function () {
    return schema;
  };
  instance.prototype.getModel = function () {
    return model;
  };
  instance.prototype.get = function (key) {
    return this.__data[key] === 'undefined' ? '' : this.__data[key];
  };
  instance.prototype.set = function (key, val) {
    this.__data[key] = val;
    this.__change[key] = val;
    return this;
  };
  instance.prototype.save = function () {
    const record = this;
    if (!this.__change) return this;
    return model.save(this).then(() => {
      record.__change = {};
      record.__is_new = false;
      return record;
    });
  };
  instance.prototype.setQuery = function (query) {
    model.setQuery(query);
    return this;
  };
  instance.prototype.toJSON = function () {
    return this.__data;
  };
  for (const index in schema.methods) {
    instance.prototype[index] = schema.methods[index];
  }
  for (const index in keys) {
    const field = keys[index];
    const get = schema.get[field] || function () {
      return this.get(field);
    };
    const set = schema.set[field] || function (value) {
      return this.set(field, value);
    };
    Object.defineProperty(instance.prototype, field, {
      get,
      set,
    });
  }
  return instance;
}
const default_timestamps = {
  create_time: 'create_time',
  update_time: 'update_time',
  delete_time: 'delete_time',
};

function Schema(info) {
  this.auto_increment = info.auto_increment || false;
  this.primary = info.primary || false;
  this._fields = info.fields;
  this._index = info.index || false;
  this._expire = info.expire || 0;
  this.default = info.default || {};
  if (info.timestamps) {
    this.soft_delete = info.soft_delete || default_timestamps.delete_time;
    this.update_time = info.update_time || default_timestamps.update_time;
    this.create_time = info.create_time || default_timestamps.create_time;
  } else {
    this.soft_delete = info.soft_delete || false;
    if (this.soft_delete === true) this.soft_delete = default_timestamps.delete_time;
    this.update_time = info.update_time || false;
    if (this.update_time === true) this.update_time = default_timestamps.update_time;
    this.create_time = info.create_time || false;
    if (this.create_time === true) this.create_time = default_timestamps.create_time;
  }
  if (this.soft_delete) {
    this.default[this.soft_delete] = 0;
    this._fields.push(this.soft_delete);
  }
  if (this.update_time) {
    this.default[this.update_time] = 0;
    this._fields.push(this.update_time);
  }
  if (this.create_time) {
    this.default[this.create_time] = 0;
    this._fields.push(this.create_time);
  }
  this.methods = info.methods || {};
  this.get = info.get || {};
  this.set = info.set || {};
}
Schema.prototype.getPrimary = function () {
  return this.primary;
};
Schema.prototype.isAutoIncrement = function () {
  return this.auto_increment;
};
Schema.prototype.setUpdateField = function (field) {
  this.update_time = field;
};
Schema.prototype.getUpdateField = function () {
  return this.update_time;
};
Schema.prototype.setCreateField = function (field) {
  this.create_time = field;
};
Schema.prototype.getCreateField = function () {
  return this.create_time;
};
Schema.prototype.setSoftDelete = function (field) {
  this.soft_delete = field;
};
Schema.prototype.getSoftDelete = function () {
  return this.soft_delete;
};
Schema.prototype.fields = function () {
  return this._fields;
};
Schema.prototype.index = function () {
  return this._index;
};
Schema.prototype.expire = function () {
  return this._expire;
};

function Model(name, schema) {
  this.table_name = name;
  this.schema = schema;
  this.query = new Query(this);
  this.Record = new Record(this);
  events.EventEmitter.call(this);
}
util.inherits(Model, events.EventEmitter);
Model.prototype.setQuery = function (query) {
  this.query.set(query);
  return this;
};
Model.prototype.resetQuery = function () {
  const { query } = this;
  this.query = new Query(this);
  return query;
};
Model.prototype.recordInstance = function (data, is_new = true) {
  return new this.Record(data, is_new);
};
Model.prototype.deleteByKey = function (key) {
  const primary = this.schema.getPrimary();
  if (!primary) throw new Error('Model do not have primary');
  const field = this.schema.getSoftDelete();
  if (field) {
    const data = {};
    data[field] = Date.nowTime();
    return this.updateByKey(key, data);
  } else {
    const query = {
      where: [
        [primary, '=', key],
      ],
    };
    return this.deleteByQuery(query);
  }
};
Model.prototype.recoveryByKey = function (key) {
  const field = this.schema.getSoftDelete();
  if (field) {
    const data = {};
    data[field] = 0;
    return this.updateByKey(key, data);
  } else {
    throw new Error('Model not soft delete');
  }
};
Model.prototype.updateByKey = function (key, data) {
  const primary = this.schema.getPrimary();
  if (!primary) throw new Error('Model do not have primary');
  const query = {
    where: [
      [primary, '=', key],
    ],
  };
  const field = this.schema.getUpdateField();
  if (field) {
    data[field] = Date.nowTime();
  }
  return this.updateByQuery(query, data);
};
Model.prototype.updateByQuery = function (query, data) {
  query.update = true;
  query.value = data;
  query = this.setQuery(query).resetQuery();
  return executor.handle(query).then((result) => {
    if (result.changedRows > 0) {
      return true;
    } else {
      return null;
      // throw new Error("Model sql handle change 0");
    }
  });
};
Model.prototype.deleteByQuery = function (query) {
  query.delete = true;
  query = this.setQuery(query).resetQuery();
  return executor.handle(query).then((result) => {
    if (result.changedRows > 0) {
      return true;
    } else {
      return null;
      // throw new Error("Model sql handle change 0");
    }
  });
};
Model.prototype.delete = function (data) {
  const primary = this.schema.getPrimary();
  if (!primary) throw new Error('Model do not have primary');
  const field = this.schema.getSoftDelete();
  if (field) {
    data.set(field, Date.nowTime());
    return this.update(data);
  } else {
    const query = {
      where: [
        [primary, '=', data.get(primary)],
      ],
    };
    return this.deleteByQuery(query);
  }
};
Model.prototype.recovery = function (data) {
  const field = this.schema.getSoftDelete();
  if (field) {
    data.set(field, 0);
    return this.update(data);
  } else {
    throw new Error('Model not soft delete');
  }
};
Model.prototype.getByKey = function (key) {
  const primary = this.schema.getPrimary();
  if (!primary) throw new Error('Model do not have primary');
  const where = [
    [primary, '=', key],
  ];
  return this.find(where, [0, 1]).then((result) => {
    return result ? (result[0] || null) : null;
  });
};
Model.prototype.find = function (where, limit, order) {
  const field = this.schema.getSoftDelete();
  if (field) {
    where.push([field, '=', 0]);
  }
  const query = {
    where,
    limit,
    order,
  };
  return this.findByQuery(query);
};
Model.prototype.findByQuery = function (query) {
  query.select = true;
  query = this.setQuery(query).resetQuery();
  return executor.handle(query).then((result) => {
    if (!result || result.length <= 0) return [];
    for (const i in result) {
      result[i] = this.recordInstance(result[i], false);
    }
    return result;
  });
};
Model.prototype.findList = function (query, page, number) {
  if (number >= 0) query.limit = [page ? (page - 1) * number : 0, number];
  return this.findByQuery(query);
};
Model.prototype.one = function (query) {
  query.limit = 1;
  return this.findByQuery(query).then((result) => {
    return result ? (result[0] || null) : null;
  });
};
Model.prototype.count = function (where) {
  if (!where) where = [];
  const field = this.schema.getSoftDelete();
  if (field) {
    where.push([field, '=', 0]);
  }
  const query = this.setQuery({
    table_name: this.table_name,
    where,
  }).resetQuery();
  return executor.count(query);
};
Model.prototype.update = function (data) {
  const model = this;
  const primary = this.schema.getPrimary();
  if (!primary) throw new Error('Model do not have primary');
  const field = this.schema.getUpdateField();
  this.emit('beforeUpdate', data);
  if (field) {
    data.set(field, Date.nowTime());
  }
  const change = data.__change;
  if (primary && this.schema.isAutoIncrement()) delete change[primary];
  const query = {
    where: [
      [primary, '=', data.get(primary)],
    ],
  };
  return this.updateByQuery(query, change).then((result) => {
    result = result ? data : result;
    model.emit('afterUpdate', data);
    return result;
  });
};
Model.prototype.insert = function (data, query = {}, update = {}) {
  return this.insertBatch([data], query, update).then((result) => {
    return result[0] || null;
  });
};
Model.prototype.insertBatch = function (list, query = {}, update = {}) {
  const model = this;
  const time = Date.nowTime();
  const create_field = this.schema.getCreateField();
  const update_field = this.schema.getUpdateField();
  const delete_field = this.schema.getSoftDelete();
  const primary = this.schema.isAutoIncrement() ? this.schema.getPrimary() : false;
  const keys = this.schema.fields();
  const values = [];
  for (const index in list) {
    let data = list[index];
    if (!(data instanceof this.Record)) data = this.recordInstance(data, true);
    this.emit('beforeInsert', data);
    if (create_field) data.set(create_field, time);
    if (update_field) data.set(update_field, time);
    if (delete_field) data.set(delete_field, 0);
    const value = {};
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === primary) {
        continue;
      }
      value[keys[i]] = data.get(keys[i]);
    }
    values.push(value);
    list[index] = data;
  }
  if (update) {
    if (update_field) update[update_field] = time;
  }
  if (!query) query = {};
  query.insert = true;
  query.value = values;
  query.update = update;
  query = this.setQuery(query).resetQuery();
  return executor.handle(query).then((result) => {
    const field = model.schema.getPrimary();
    let id = model.schema.isAutoIncrement() ? result.insertId - list.length : 0;
    for (const index in list) {
      const data = list[index];
      data.__is_new = false;
      if (model.schema.isAutoIncrement()) {
        id++;
        data.set(field, id);
      }
      data.change = {};
      model.emit('afterInsert', data);
    }
    return list;
  });
};
Model.prototype.replace = function (data) {
  return this.insert(data, { replace: true });
};
Model.prototype.save = function (data) {
  const primary = this.schema.getPrimary();
  if (!primary) throw new Error('Model do not have primary');
  if (data.__is_new) {
    return this.insert(data);
  } else {
    return this.update(data);
  }
};


module.exports.executor = executor;
module.exports.Model = Model;
module.exports.Record = Record;
module.exports.Schema = Schema;
module.exports.Query = Query;
