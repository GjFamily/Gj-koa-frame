/**
 * Created by gaojie on 17-2-17.
 */
/**
 * 添加权限处理根据上游的middle情况调整权限获取方式
 * @constructor
 */
var config = require('../config');

// var redis = require('../tools/redis');
var uid = require('uid-safe');
var jwt = require('jsonwebtoken');


var auth = function (opts) {
  opts = opts || {};
  opts.noLogin = opts.noLogin || defaultFail;
  opts.noAuth = opts.noAuth || defaultFail;
  opts.role = opts.role || null;
  opts.role_key = opts.role_key || opts.role + '_id';
  opts.exclude = opts.exclude || [];
  opts.id = 'id';
  return {
    // 验证当前访问授权状态
    session :function *(next){
      // 设置默认的缓存器，如果安装session，则存储在session中
      this.cache = this.session || {};
      let filter = filterPath(this, opts.exclude);
      if(!filter){
        if (!this.cache[opts.id]) return yield opts.noLogin(this);
        if(opts.auth && !(yield opts.auth(this))) return yield opts.noAuth(this);
      }

      if (this.cache[opts.id]) {
        this.cache['time'] = Date.now()
      }
      yield next;
    },
    token: function *(next){
      let filter = filterPath(this, opts.exclude);
      if(!filter){
        if(opts.auth && !(yield opts.auth(this))) return yield opts.noAuth(this);
      }
      yield next;
    },
    // 绑定到不同角色的授权信息
    loginRole: function (role, role_key){
      role_key = role_key || role + '_id';
      return function *(info){
        this.cache[opts.id] = info[role_key];
        this.cache['role'] = role;
        for(let index in info){
          this.cache[index] = info[index];
        }
        info['role'] = role;
        return info;
      }
    },
    // 绑定session授权信息
    login: function *(info){
      if(info.role){
        this.cache[opts.id] = info[info.role + '_id'];
        this.cache['role'] = info.role;
      }else{
        this.cache[opts.id] = info[opts.role_key];
        this.cache['role'] = opts.role;
        info['role'] = opts.role;
      }
      for(let index in info){
        this.cache[index] = info[index];
      }
      return info;
    },
    // 退出当前授权
    logout: function *(){
      this.cache[opts.id] = null;
      this.cache['role'] = null;
      return {}
    },
    // 设定无需权限路由
    access: function(route){
      opts.exclude.push(route);
      return route;
    },
    // 生成授权token,符合jwt规范
    jwt: function *({ expire=60 }){
      var payload = {};
      payload['id'] = this.cache[this.cache.role + '_id'];
      payload['username'] = this.cache[this.cache.role + '_name'];

      var token = jwt.sign(payload, config.jwt.secret);
      this.cookies.set(config.jwt.cookie_name, token, {
        maxAge: expire * 1000,
        httpOnly: true,
        domain: config.jwt.cookie_domain
      });
      return {};
    },
    // 刷新登陆信息
    refresh: function *(){
      // 会走session中间件，为空即可
    }
  }
};

var filterPath = function (ctx, exclude) {
  for (let index in exclude) {
    if (ctx.path.indexOf(exclude[index]) > 0) return true;
  }
  return false;
};

var defaultFail = function (ctx) {
  ctx.body = '401 Unauthorized';
  ctx.status = 401;
};

module.exports = auth;
module.exports.roles = {
  USER: 'user' // 账号
};
