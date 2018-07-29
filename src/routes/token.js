// import auth_help from '../helps/auth';
import { SwaggerRouter } from '../helps/swagger';
import { response } from '../helps/controller';

const api = new SwaggerRouter({
  prefix: '/token',
  title: 'Token接口',
  description: 'Token接口描述',
  version: '1.0.0',
  name: 'token api',
  tags: {
    auth: '权限接口',
  },
});
api.registerResponse(401, 'AUTH_ERROR', response(null, true));
api.security.key('token', 'header', function* () {
  return null;
});
api.security.fail(function* (ctx) {
  ctx.body = {
    status: 403,
    message: '未授权，无法访问！',
  };
  ctx.status = 200;
});

export default api;
