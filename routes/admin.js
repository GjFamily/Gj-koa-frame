const parse = require('../helps/controller');
const redis = require('../tools/redis');
const auth_help = require('../helps/auth');
const { EmptyException } = require('../helps/exception');
const koaBetterBody = require('koa-better-body');
// const path = require('path');
const middlewares = require('koa-middlewares');
const admin = require('koa-router')({
  prefix: '/admin',
});

// 添加session验证
const cookie = {
  httpOnly: true,
  path: '/',
  overwrite: true,
  signed: false,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 day in ms
};
const session_key = 'il';
const session = middlewares.session({
  key: session_key,
  store: redis.store,
  cookie,
});
admin.use(session);
const auth = auth_help({
  * noLogin(ctx) {
    ctx.body = {
      status: 401,
      message: '未登录，无法访问！',
    };
    ctx.status = 200;
  },
  * noAuth(ctx) {
    ctx.body = {
      status: 403,
      message: '未授权，无法访问！',
    };
    ctx.status = 200;
  },
  * auth() {
    // let body = ctx.request.body || {};
    // let path = ctx.params || {};
    // let query = ctx.request.query || {};
    return true;
  },
});
admin.use(auth.session);
// 免验证
admin.post(auth.access('/login'), parse([function* (p) { this.cache = p; return p; }, function* (p) {
  const a = p;
  a.token = this.cache.token;
  return a;
}], [{ name: 'code', body: true }]));

// 上传文件：
admin.post('/api', koaBetterBody(), parse(function* ({ file }) {
  if (!file || file.length === 0) throw EmptyException('文件上传失败');
  const f = file[0];
  return f;
}, [{ name: 'file', form: true }]));

module.exports = admin;
