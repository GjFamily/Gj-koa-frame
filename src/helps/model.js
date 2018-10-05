/**
 * Created by gaojie on 2017/3/15.
 */
import debug from 'debug';
import events from 'events';
import co from 'co';
import mysql from '../tools/mysql';
import { formatData } from './tools';
// const config = require('../config');

const redis = {}; // require('../tools/redis');
const debuger = debug('app:model');

// const MODEL_ORDER_ASC = 'asc';
const MODEL_ORDER_DESC = 'desc';

export class Query {
  constructor(model) {
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
  bind(ctx) {
    this.query.ctx = ctx;
    return this;
  }
  table_name(table_name) {
    this.query.table_name = table_name;
    return this;
  }
  set(query) {
    if (query instanceof Query) {
      Object.assign(this.query, query.query);
    } else {
      Object.assign(this.query, query);
    }
    return this;
  }
  get() {
    return this.query;
  }
  alias(a) {
    this.query.alias = a;
    return this;
  }
  limit(offset = 0, num = 0) {
    this.query.limit = [offset, num];
    return this;
  }
  select() {
    this.query.select = true;
    return this;
  }
  one() {
    this.query.limit = [0, 1];
    return this;
  }
  count() {
    this.query.field = 'COUNT(*)';
    this.query.count = true;
    this.query.select = true;
    if (!this.query.where || this.query.where.length === 0) this.query.where = '1';
    return this;
  }
  order(field, d) {
    d = d || MODEL_ORDER_DESC;
    this.query.order = [field, d];
    return this;
  }
  all() {
    this.query.limit = [];
    return this.select();
  }
  field(field) {
    this.query.field = field;
    return this;
  }
  delete() {
    this.query.delete = true;
    return this;
  }
  update(data) {
    this.query.update = true;
    this.query.value = data;
    return this;
  }
  connect(connect) {
    this.query.connect = connect;
    return this;
  }
}
export class Executor {
  constructor(m, r) {
    this.mysql = m;
    this.redis = r;
    this.app = {};
  }

  exec(sql, connect) {
    // if(this.app.__MOCK__){
    //   return Promise.resolve(new MockModel(this.mockData, sql).exec(sql));
    // }else{
    return this.mysql.promise(sql, connect);
    // }
  }
  handle(query) {
    if (query instanceof Query) query = query.get();
    if (!query.alias) query.alias = '';
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
  }
  handle_sql(query) {
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
      sql = `SELECT ${this._field(query.field, query.alias)} FROM ${query.table_name} ${query.alias} ${this._join(query.join)} WHERE ${this._where(query.where, query.alias)} ${order} ${limit}`;
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
    if (query.ctx) {
      query.ctx.debug.sql.push(sql);
    }
    return this.exec(sql, query.connect).then();
    // }
  }
  getCacheKey(query) {
    const key_prefix = `model:cache:${query.table_name}.`;
    this.index = '';
    // 分析主键
    if (query.primary) {
      if (query.insert) {
        this.index = `${key_prefix}${query.primary}.${query.value}`;
      }
    }
    // 分析索引
    return this.index;
  }
  getCache(key) {
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
  }
  setCache(key, result, expire) {
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
  }
  clearCache(key) {
    if (!key) return Promise.reject();
    const r = this.redis;
    // 删除对应索引的所有缓存
    if (key instanceof Array) return r.del(key[0]);
    else return r.del(key);
  }
  count(query) {
    if (!(query instanceof Query)) query = new Query().set(query);
    return this.handle(query.count()).then((result) => { return result[0]['COUNT(*)']; });
  }
  startTransaction() {
    return this.mysql.transaction();
  }
  commit(t) {
    return this.mysql.commit(t);
  }
  rollback(t) {
    return this.mysql.rollback(t);
  }
  transactions(cb, ctx) {
    return this.mysql.transactions((connect) => {
      const query = new Query().connect(connect);
      if (ctx) query.bind(ctx);
      return co(cb(query));
    });
  }
  _v(v) {
    return this.mysql.escape(v);
  }
  escape(v) {
    return this.mysql.escape(v);
  }
  _f(f, a) {
    this.load++;
    return a ? `${a}.\`${f}\`` : `\`${f}\``;
  }
  _addValue(value, field) {
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
  }
  _setValue(value, field) {
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
  }
  _field(field, alias) {
    if (field instanceof Array) {
      for (const i in field) {
        let item = field[i];
        if (item instanceof Array) {
          field[i] = this._f(field[i][0], field[i][1]);
        } else {
          field[i] = this._f(field[i], alias);
        }
      }
      return field.join(',');
    } else if (typeof (field) === 'string' && field) {
      return field;
    } else {
      return this._f('*', alias);
    }
  }
  _where(where, alias) {
    const tmp = [];
    if (!where || where.length === 0) tmp.push('1');
    for (const i in where) {
      if (typeof where[i] === 'string') {
        tmp.push(where[i]);
      } else if (typeof where[i] === 'object') {
        if (where[i][1] === 'in' || where[i][1] === 'not in') {
          tmp.push(`${this._f(where[i][0], where[i][3] || alias)} ${where[i][1]} (${where[i][2].join(',')})`);
        } else if (where[i][1] === 'like') {
          tmp.push(`${this._f(where[i][0], where[i][3] || alias)} ${where[i][1]} '%${where[i][2]}%'`);
        } else if (where[i][1] === '==') {
          tmp.push(`${this._f(where[i][0], where[i][3] || alias)} = ${where[i][2]}`);
        } else {
          tmp.push(`${this._f(where[i][0], where[i][3] || alias)} ${where[i][1]} ${this._v(where[i][2])}`);
        }
      }
    }
    return tmp.join(' AND ');
  }
  _join(join) {
    if (!join) return '';
    let tmp = [];
    if (typeof join === 'string') {
      return join;
    } else if (join instanceof Array) {
      tmp = join.map((row) => {
        if (typeof row === 'string') return row;
        return `${row[3] || ''} join ${this._f(row[0])} ${row[1]} on ${this._where(row[2], row[1])}`;
      });
    } else {
      for (const i in join) {
        let item = join[i];
        tmp.push(`${item.type} ${this._f(i)} ${item.alias} on ${this._where(item.where, item.alias)}`);
      }
    }
    return tmp.join(' ');
  }
}
const executor = new Executor(mysql, redis);
class Record {
  constructor(model) {
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
            this.__data[field] = schema.default[field] === undefined ? null : schema.default[field];
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
    instance.prototype.bind = function (ctx) {
      this.ctx = ctx;
      return this;
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
}
const default_timestamps = {
  create_time: 'create_time',
  update_time: 'update_time',
  delete_time: 'delete_time',
};

export class Schema {
  constructor(info) {
    this.auto_increment = info.auto_increment || false;
    this.primary = info.primary || false;
    this._fields = info.fields;
    this._baseFields = Array.from(info.fields);
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
  getPrimary() {
    return this.primary;
  }
  isAutoIncrement() {
    return this.auto_increment;
  }
  setUpdateField(field) {
    this.update_time = field;
  }
  getUpdateField() {
    return this.update_time;
  }
  setCreateField(field) {
    this.create_time = field;
  }
  getCreateField() {
    return this.create_time;
  }
  setSoftDelete(field) {
    this.soft_delete = field;
  }
  getSoftDelete() {
    return this.soft_delete;
  }
  fields() {
    return this._fields;
  }
  baseFields() {
    return this._baseFields;
  }
  index() {
    return this._index;
  }
  expire() {
    return this._expire;
  }
}

export class Model extends events.EventEmitter {
  constructor(name, schema) {
    super();
    this.table_name = name;
    this.schema = schema;
    this.query = new Query(this);
    this.Record = new Record(this);
    events.EventEmitter.call(this);
    debuger(`register model: ${name}`);
  }
  bind(ctx) {
    this.query.bind(ctx);
    return this;
  }
  setQuery(query) {
    this.query.set(query);
    return this;
  }
  resetQuery() {
    const { query } = this;
    this.query = new Query(this);
    return query;
  }
  recordInstance(data, is_new = true) {
    return new this.Record(data, is_new);
  }
  deleteByKey(key) {
    const primary = this.schema.getPrimary();
    if (!primary) throw new Error('Model do not have primary');
    const field = this.schema.getSoftDelete();
    if (field) {
      const data = {};
      data[field] = new Date();
      return this.updateByKey(key, data);
    } else {
      const query = {
        where: [
          [primary, '=', key],
        ],
      };
      return this.deleteByQuery(query);
    }
  }
  recoveryByKey(key) {
    const field = this.schema.getSoftDelete();
    if (field) {
      const data = {};
      data[field] = null;
      return this.updateByKey(key, data);
    } else {
      throw new Error('Model not soft delete');
    }
  }
  updateByKey(key, data) {
    const primary = this.schema.getPrimary();
    if (!primary) throw new Error('Model do not have primary');
    const query = {
      where: [
        [primary, '=', key],
      ],
    };
    const field = this.schema.getUpdateField();
    if (field) {
      data[field] = new Date();
    }
    return this.updateByQuery(query, data);
  }
  updateByQuery(query, data) {
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
  }
  deleteByQuery(query) {
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
  }
  delete(data) {
    const primary = this.schema.getPrimary();
    if (!primary) throw new Error('Model do not have primary');
    const field = this.schema.getSoftDelete();
    if (field) {
      data.set(field, new Date());
      return this.update(data);
    } else {
      // todo sql
      const query = {
        where: [
          [primary, '=', data.get(primary)],
        ],
      };
      return this.deleteByQuery(query);
    }
  }
  recovery(data) {
    const field = this.schema.getSoftDelete();
    if (field) {
      data.set(field, null);
      return this.update(data);
    } else {
      throw new Error('Model not soft delete');
    }
  }
  findByKey(key) {
    const primary = this.schema.getPrimary();
    if (!primary) throw new Error('Model do not have primary');
    const where = [
      [primary, '=', key],
    ];
    return this.find({ where, limit: [0, 1] }).then((result) => {
      return result ? (result[0] || null) : null;
    });
  }
  find(query) {
    const field = this.schema.getSoftDelete();
    query.where = query.where || [];
    if (field) {
      query.where.push([field, 'is', null]);
    }
    return this.findByQuery(query);
  }
  findByQuery(query) {
    query = query || new Query();
    query.select = true;
    query = this.setQuery(query).resetQuery();
    return executor.handle(query).then((result) => {
      if (!result || result.length <= 0) return [];
      for (const i in result) {
        result[i] = this.recordInstance(result[i], false);
      }
      return result;
    });
  }
  one(query) {
    query.limit = 1;
    return this.find(query).then((result) => {
      return result ? (result[0] || null) : null;
    });
  }
  count(query) {
    query.where = query.where || [];
    const field = this.schema.getSoftDelete();
    if (field) {
      query.where.push([field, 'is', null]);
    }
    query = this.setQuery(query).resetQuery();
    return executor.count(query);
  }
  findListAndCount(where, page, number, order, query) {
    query = query ? Object.assign(query, { where }) : { where };
    return this.count(query)
      .then((total) => {
        if (total > 0) {
          return this.find(Object.assign(query, { where, limit: [page ? (page - 1) * number : 0, number], order }))
            .then((list) => {
              return {
                total,
                list,
              };
            });
        } else {
          return {
            total,
            list: [],
          };
        }
      });
  }
  update(data) {
    const model = this;
    const primary = this.schema.getPrimary();
    if (!primary) throw new Error('Model do not have primary');
    const field = this.schema.getUpdateField();
    this.emit('beforeUpdate', data);
    if (field) {
      data.set(field, new Date());
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
  }
  insert(data, query = null, update = null) {
    return this.insertBatch([data], query, update).then((result) => {
      return result[0] || null;
    });
  }
  insertBatch(list, query = null, update = null) {
    const model = this;
    const time = new Date();
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
      if (delete_field) data.set(delete_field, null);
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
  }
  replace(data) {
    return this.insert(data, { replace: true });
  }
  save(data) {
    const primary = this.schema.getPrimary();
    if (!primary) throw new Error('Model do not have primary');
    if (data.__is_new) {
      return this.insert(data);
    } else {
      return this.update(data);
    }
  }
}
export class BaseModel extends Model {
  get(id) {
    return this.findByKey(id);
  }
  getIds(ids) {
    return this.find({
      where: [
        ['id', 'in', ids],
      ],
    });
  }
  add(data) {
    return this.insert(formatData(this.schema.baseFields(), data));
  }
  put(id, data) {
    return this.updateByKey(id, formatData(this.schema.baseFields(), data));
  }
  del(id) {
    return this.deleteByKey(id);
  }
  search(where, page = 1, number = 50, order = 'id', direction = 'desc') {
    return this.findListAndCount(where, page, number, `\`${order}\` ${direction}`);
  }
}
