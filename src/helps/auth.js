/**
 * Created by gaojie on 17-2-17.
 * 添加权限处理根据上游的middle情况调整权限获取方式
 * @constructor
 */
const config = require('../config');

// var redis = require('../tools/redis');
// const uid = require('uid-safe');
const jwt = require('jsonwebtoken');

const auth = function (opts) {
  opts = opts || {};
  opts.role = opts.role || null;
  opts.role_key = opts.role_key || `${opts.role}_id`;
  opts.id = opts.id || 'id';
  return {
    // 验证当前访问授权状态
    * session(next) {
      // 设置默认的缓存器，如果安装session，则存储在session中
      this.cache = this.session || {};

      if (this.cache[opts.id]) {
        this.cache.time = Date.now();
      }
      yield next;
      return null;
    },
    // 绑定到不同角色的授权信息
    loginRole(role, role_key) {
      role_key = role_key || `${role}_id`;
      return function* middle(info) {
        this.cache[opts.id] = info[role_key];
        this.cache.role = role;
        for (const index in info) {
          this.cache[index] = info[index];
        }
        info.role = role;
        return info;
      };
    },
    // 绑定session授权信息
    * login(info) {
      if (info.role) {
        this.cache[opts.id] = info[`${info.role}_id`];
        this.cache.role = info.role;
      } else {
        this.cache[opts.id] = info[opts.role_key];
        this.cache.role = opts.role;
        info.role = opts.role;
      }
      for (const index in info) {
        this.cache[index] = info[index];
      }
      return info;
    },
    // 退出当前授权
    * logout() {
      this.cache[opts.id] = null;
      this.cache.role = null;
      return {};
    },
    // 生成授权token,符合jwt规范
    jwt({ expire = 60 }) {
      const payload = {};
      payload.id = this.cache[`${this.cache.role}_id`];
      payload.username = this.cache[`${this.cache.role}_name`];

      const token = jwt.sign(payload, config.jwt.secret);
      this.cookies.set(config.jwt.cookie_name, token, {
        maxAge: expire * 1000,
        httpOnly: true,
        domain: config.jwt.cookie_domain,
      });
      return {};
    },
    // 刷新登陆信息
    * refresh() {
      // 会走session中间件，为空即可

    },
  };
};

module.exports = auth;
module.exports.middleware = function (auth_list, fail) {
  return function* AuthMiddleware(next) {
    let flag = false;
    for (const key in auth_list) {
      const result = yield auth_list[key](this);
      if (result) flag = result;
    }
    if (!flag && auth_list.length > 0) return yield fail(this);
    yield next;
    return null;
  };
};
module.exports.roles = {
  USER: 'user', // 账号
};
