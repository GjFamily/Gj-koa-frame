var parse = require('../helps/controller');
var auth_help = require('../helps/auth');
const koaBetterBody = require('koa-better-body');
const path = require('path');
var template = require('koa-router')({
  prefix: '/template'
})
var auth = auth_help({
  noAuth: function* (ctx) {
    ctx.body = {
      status: 403,
      message: "未授权，无法访问！"
    };
    ctx.status = 401;
  },
  auth: function* (ctx) {
    let header = ctx.request.header || {};
    if (!header || !header['token']) {
      return false;
    }
    try {
      let t = true;
      if (t) {
        ctx.cache = {
          user_id: t.user_id
        }
        return true;
      }
    } catch (err) {
      return false;
    }
  }
});
// 添加token验证
template.use(auth.token);
// 添加session验证
var cookie = {
  httpOnly: true,
  path: '/',
  overwrite: true,
  signed: false,
  maxAge: 30 * 24 * 60 * 60 * 1000 //30 day in ms
};
const session_key = 'il';
var session = middlewares.session({
  key: session_key,
  store: redis.store,
  cookie: cookie,
});
web.use(session);
var auth = auth_help({
  noLogin: function*(ctx) {
    ctx.body = {
      status: 401,
      message: "未登录，无法访问！"
    };
    ctx.status = 200;
  },
  noAuth: function*(ctx) {
    ctx.body = {
      status: 403,
      message: "未授权，无法访问！"
    };
    ctx.status = 200;
  },
  auth: function*(ctx) {
    let body = ctx.request.body || {};
    let path = ctx.params || {};
    let query = ctx.request.query || {};
    return true;
  }
});
web.use(auth.session);
// 免验证
template.post(auth.access('/login'), parse([function* (p) { this.cache = p; return p }, function* (p) { p.token = this.cache.token; return p }], [{ name: 'code', body: true }]));

// 上传文件：
template.post('/api', koaBetterBody(), parse(function* ({ file }) { 
  console.log(file)
  if (!file || file.length == 0) throw EmptyException("文件上传失败");
  var file = file[0];
  let file_name = 'image' + path.extname(file.name); }, [{ name: 'file', form: true }]));


module.exports = template
