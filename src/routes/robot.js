import parse from '../helps/controller';
import auth_help from '../helps/auth';
// const { EmptyException } = require('../helps/exception');
// const koaBetterBody = require('koa-better-body');
// const path = require('path');
import * as authController from '../controllers/robot/auth';
import * as bookController from '../controllers/robot/book';
import * as soundController from '../controllers/robot/sound';
import * as robotController from '../controllers/robot/robot';
import * as notifyController from '../controllers/robot/notify';
// import * as commonController from '../controllers/common';

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
      const t = yield authController.validToken({ token: header.token });
      if (t) {
        ctx.cache = {
          robot_id: t.id,
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
robot.post(auth.access('/auth/token'), parse(authController.register, [{ name: 'code', body: true }]));

robot.post('/auth/refresh_token', parse(authController.refreshToken, [{ name: 'refresh_token', body: true }, { name: 'robot_id', cache: true }]));

robot.put('/notify/:type', parse(notifyController.add, [{ name: 'type', path: true }, { name: 'module', body: true }, { name: 'module_id', body: true }, { name: 'duration', body: true }, { name: 'percent', body: true }, { name: 'robot_id', cache: true }]));

robot.get('/base/night', parse(robotController.getNight, [{ name: 'robot_id', cache: true }]));
robot.get('/base/anti_addiction', parse(robotController.getAntiAddiction, [{ name: 'robot_id', cache: true }]));
robot.get('/sound/voice/:voice_id', parse(soundController.getVoice, [{ name: 'voice_id', path: true }]));
robot.get('/book/album/:album_id', parse(bookController.getAlbum, [{ name: 'album_id', path: true }]));
export default robot;
