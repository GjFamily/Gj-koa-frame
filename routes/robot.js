const parse = require('../helps/controller');
const auth_help = require('../helps/auth');
// const { EmptyException } = require('../helps/exception');
// const koaBetterBody = require('koa-better-body');
// const path = require('path');
const robot = require('koa-router')({
  prefix: '/robot',
});

const auth = auth_help({
  * noAuth(ctx) {
    ctx.body = {
      status: 403,
      message: '未授权，无法访问！',
    };
    ctx.status = 401;
  },
  * auth(ctx) {
    const header = ctx.request.header || {};
    if (!header || !header.token) {
      return false;
    }
    try {
      const t = true;
      if (t) {
        ctx.cache = {
          user_id: t,
        };
      }
      return t;
    } catch (err) {
      return false;
    }
  },
});
// 添加token验证
robot.use(auth.token);

// 免验证
robot.post(auth.access('/login'), parse([function* (p) { this.cache = p; return p; }, function* (p) {
  const a = p;
  a.token = this.cache.token;
  return a;
}], [{ name: 'code', body: true }]));

module.exports = robot;
