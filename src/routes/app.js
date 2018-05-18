import parse from '../helps/controller';
import auth_help from '../helps/auth';
// const { EmptyException } = require('../helps/exception');
// const koaBetterBody = require('koa-better-body');
// const path = require('path');
import * as authController from '../controllers/app/auth';
import * as bookController from '../controllers/app/book';
import * as soundController from '../controllers/app/sound';
import * as baseController from '../controllers/app/base';
import * as statController from '../controllers/app/stat';
import * as robotController from '../controllers/app/robot';
import * as commonController from '../controllers/common';

function* getRobot(params) {
  if (!params.user_id) return params;
  let info = yield robotController.getRobotId(params);
  params.robot_id = info.robot_id;
  return params;
}

const app = require('koa-router')({
  prefix: '/app',
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
          user_id: t.id,
        };
      }
      return t;
    } catch (err) {
      return false;
    }
  },
});
// 添加token验证
app.use(auth.token);

// 免验证
app.post(auth.access('/auth/register'), parse(authController.register, [{ name: 'mobile', body: true }, { name: 'password', body: true }, { name: 'mobile_code', body: true }, { name: 'verification_code', body: true }]));
app.post(auth.access('/auth/login'), parse(authController.login, [{ name: 'mobile', body: true }, { name: 'password', body: true }]));
app.post(auth.access('/auth/forget'), parse(authController.resetPassword, [{ name: 'mobile', body: true }, { name: 'password', body: true }, { name: 'mobile_code', body: true }, { name: 'verification_code', body: true }]));
app.post('/auth/refresh', parse(authController.refreshToken, [{ name: 'refresh_token', body: true }, { name: 'user_id', cache: true }]));

app.post('/my/password', parse(authController.changePassword, [{ name: 'old_password', body: true }, { name: 'new_password', body: true }, { name: 'user_id', cache: true }]));
app.get('/my/info', parse(authController.getInfo, [{ name: 'user_id', cache: true }]));
app.post('/my/info', parse(authController.putInfo, [{ name: 'username', body: true }, { name: 'avatar', body: true }, { name: 'nickname', body: true }, { name: 'wechat', body: true }, { name: 'type', body: true }, { name: 'user_id', cache: true }]));

// robot
app.get('/robot/info', parse([getRobot, robotController.getInfo], [{ name: 'user_id', cache: true }]));
app.post('/robot/info', parse(robotController.bind, [{ name: 'code', form: true }, { name: 'user_id', cache: true }]));
app.put('/robot/info', parse([getRobot, robotController.putInfo], [{ name: 'avatar', body: true }, { name: 'nickname', body: true }, { name: 'birthday', body: true }, { name: 'gender', body: true }, { name: 'user_id', cache: true }]));
app.get('/robot/night', parse([getRobot, robotController.getNight], [{ name: 'user_id', cache: true }]));
app.put('/robot/night', parse([getRobot, robotController.putNight], [{ name: 'is_open', body: true }, { name: 'start_time', body: true }, { name: 'end_time', body: true }, { name: 'user_id', cache: true }]));
app.get('/robot/anti_addiction', parse([getRobot, robotController.getAntiAddiction], [{ name: 'user_id', cache: true }]));
app.put('/robot/anti_addiction', parse([getRobot, robotController.putAntiAddiction], [{ name: 'is_open', body: true }, { name: 'duration', body: true }, { name: 'user_id', cache: true }]));
app.get('/robot/chat', parse([getRobot, robotController.getChat], [{ name: 'max_id', query: true }, { name: 'number', query: true }, { name: 'feature', query: true }, { name: 'user_id', cache: true }]));

// base
app.get('/message', parse([getRobot, baseController.getMessageList], [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'user_id', cache: true }]));
app.post('/feedback', parse(baseController.addFeedback, [{ name: 'content', body: true }, { name: 'user_id', cache: true }]));
app.get('/guide', parse(baseController.getGuide));
app.get('/version/app', parse(baseController.getAppVersion));
app.get('/version/robot', parse(baseController.getRobotVersion));
app.get('/banner/list', parse(baseController.getBannerList, [{ name: 'page', query: true }, { name: 'number', query: true }]));
app.get('/banner/:banner_id', parse(baseController.getBanner, [{ name: 'banner_id', path: true }]));

// sound
app.get('/sound/search', parse(soundController.searchList, [{ name: 'search', query: true }, { name: 'page', query: true }, { name: 'number', query: true }]));
app.get('/sound/category', parse(soundController.getCategoryList, [{ name: 'page', query: true }, { name: 'number', query: true }]));
app.get('/sound/category/:category_id', parse(soundController.getCategory, [{ name: 'category_id', path: true }, { name: 'page', query: true }, { name: 'number', query: true }]));
app.get('/sound/album/:album_id', parse(soundController.getAlbum, [{ name: 'album_id', path: true }]));
app.get('/sound/collect/album', parse([getRobot, soundController.getCollectAlbumList], [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'user_id', cache: true }]));
app.post('/sound/collect/album', parse([getRobot, soundController.addCollectAlbum], [{ name: 'album_id', form: true }, { name: 'user_id', cache: true }]));
app.delete('/sound/collect/album', parse([getRobot, soundController.deleteCollectAlbum], [{ name: 'album_id', query: true }, { name: 'user_id', cache: true }]));
app.get('/sound/collect/voice', parse([getRobot, soundController.getCollectVoiceList], [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'user_id', cache: true }]));
app.post('/sound/collect/voice', parse([getRobot, soundController.addCollectVoice], [{ name: 'voice_id', form: true }, { name: 'user_id', cache: true }]));
app.delete('/sound/collect/voice', parse([getRobot, soundController.deleteCollectVoice], [{ name: 'voice_id', query: true }, { name: 'user_id', cache: true }]));

// book
app.get('/book/search', parse(bookController.searchList, [{ name: 'search', query: true }, { name: 'page', query: true }, { name: 'number', query: true }]));
app.get('/book/category', parse(bookController.getCategoryList, [{ name: 'page', query: true }, { name: 'number', query: true }]));
app.get('/book/category/:category_id', parse(bookController.getCategory, [{ name: 'category_id', path: true }, { name: 'page', query: true }, { name: 'number', query: true }]));
app.get('/book/album/:album_id', parse(bookController.getAlbum, [{ name: 'album_id', path: true }]));
app.get('/book/scan/album', parse([getRobot, bookController.getScanAlbumList], [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'user_id', cache: true }]));
app.post('/book/scan/album', parse([getRobot, bookController.addScanAlbum], [{ name: 'number', form: true }, { name: 'user_id', cache: true }]));
app.delete('/book/scan/album', parse([getRobot, bookController.deleteScanAlbum], [{ name: 'album_id', query: true }, { name: 'user_id', cache: true }]));

// stat
app.get('/stat/:type/top', parse([getRobot, statController.topList], [{ name: 'type', path: true }, { name: 'module', query: true }, { name: 'top', query: true }, { name: 'user_id', cache: true }]));
app.get('/stat/:type/week', parse([getRobot, statController.week], [{ name: 'type', path: true }, { name: 'user_id', cache: true }]));
app.get('/stat/:type/aggregation', parse([getRobot, statController.aggregation], [{ name: 'type', path: true }, { name: 'module', query: true }, { name: 'user_id', cache: true }]));


// common
app.post(auth.access('/common/sms', parse(commonController.sendSMS, [{ name: 'mobile', form: true }, { name: 'area', form: true }])));
app.post(auth.access('/common/mobile', parse(commonController.validMobile, [{ name: 'mobile', form: true }, { name: 'area', form: true }])));
app.post('/common/upload/talk', parse(commonController.ossTalkToken, [{ name: 'path', form: true }]));
export default app;
