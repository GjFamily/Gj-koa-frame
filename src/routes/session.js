import * as middlewares from 'koa-middlewares';
import config from '../config';
import redis from '../tools/redis';
import authHelp from '../helps/auth';
import { SwaggerRouter } from '../helps/swagger';
import { response, IdResponse, ApiResponse, ExceptionResponse } from '../helps/controller';

const auth = authHelp();
// tags:{name:description}, title, description, version, name
const api = new SwaggerRouter({
  prefix: '/session',
  title: 'Session接口',
  description: 'Seesion接口描述',
  version: '1.0.0',
  name: 'seesion api',
  tags: {
    auth: '权限接口',
  },
});
api.security.onFail(function* (ctx) {
  ctx.body = {
    status: 403,
    message: '未授权，无法访问！',
  };
  ctx.status = 200;
});
const auth_security = api.security.key('auth', 'cookie', function* () {
  return null;
}, true);
api.registerServer(`${config.host}/session`, '测试服务器');
api.registerResponse(401, 'AUTH_ERROR', ExceptionResponse, 'AuthException');
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

api.use(session);
api.use(auth.session);
// 验证接口
api.post('/auth/login', {
  summary: '用户登录',
  description: '用户通过密码登录',
  controller: [
    function* (account) {
      let a = account;
      a.admin_id = a.id;
      return a;
    },
    auth.login,
  ],
  params: [{ name: 'username', in: 'file' }, { name: 'password', in: 'form' }],
  responses: response([
    { name: 'username', type: String, description: '用户名', required: true },
  ]),
  security: [],
});
api.get('/auth/logout', {
  summary: '退出登录',
  controller: auth.logout,
  responses: response(),
  tags: ['auth'],
  security: [auth_security],
});
api.post('/auth/editPassword', {
  summary: '修改密码',
  controller: function* edit() {
    return null;
  },
  params: { id: { cache: true }, password: { body: true } },
  image: true,
  responses: ApiResponse,
});

api.post('/common/upload/base', {
  controller: function* oss() {
    return null;
  },
  params: [{ name: 'path', form: true }],
  responses: IdResponse,
});

export default api;
