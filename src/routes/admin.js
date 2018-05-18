import * as middlewares from 'koa-middlewares';
import koaRouter from 'koa-router';
import parse from '../helps/controller';
import redis from '../tools/redis';
import authHelp from '../helps/auth';
import * as authController from '../controllers/admin/auth';
import * as baseController from '../controllers/admin/base';
import * as bookController from '../controllers/admin/book';
import * as managerController from '../controllers/admin/manager';
import * as robotController from '../controllers/admin/robot';
import * as soundController from '../controllers/admin/sound';
import * as userController from '../controllers/admin/user';
import * as commonController from '../controllers/common';

const admin = koaRouter({
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
const auth = authHelp({
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
  role: 'admin',
});
admin.use(auth.session);

// 验证接口
admin.post(auth.access('/auth/login'), parse([authController.login, function* (account) {
  let a = account;
  a.admin_id = a.id;
  return a;
}, auth.login], [{ name: 'username', body: true }, { name: 'password', body: true }]));
admin.get(auth.access('/auth/logout'), parse(auth.logout));
admin.post('/auth/editPassword', parse(authController.editPassword, [{ name: 'id', cache: true }, { name: 'password', body: true }]));

// robot接口
admin.get('/robots', parse(robotController.list, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/robot', parse(robotController.add, [{ name: 'content', form: true }]));
admin.get('/robot/:robot_id', parse(robotController.get, [{ name: 'robot_id', path: true }]));
admin.put('/robot/:robot_id', parse(robotController.put, [{ name: 'robot_id', path: true }, { name: 'data', all: true }]));

// manager接口
admin.get('/managers', parse(managerController.list, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/manager', parse(managerController.add, [{ name: 'data', all: true }]));
admin.get('/manager/:manager_id', parse(managerController.get, [{ name: 'manager_id', path: true }]));
admin.put('/manager/:manager_id', parse(managerController.put, [{ name: 'manager_id', path: true }, { name: 'data', all: true }]));
admin.del('/manager/:manager_id', parse(managerController.del, [{ name: 'manager_id', path: true }]));

// user接口
admin.get('/users', parse(userController.list, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.get('/user/:user_id', parse(userController.get, [{ name: 'user_id', path: true }]));
admin.put('/user/:user_id', parse(userController.put, [{ name: 'user_id', path: true }, { name: 'data', all: true }]));

// sound接口
admin.get('/sound/albums', parse(soundController.listAlbum, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.get('/sound/albums_ids', parse(soundController.listAlbumIds, [{ name: 'ids', query: true, array: true }]));
admin.post('/sound/album', parse(soundController.addAlbum, [{ name: 'data', all: true }]));
admin.get('/sound/album/:album_id', parse(soundController.getAlbum, [{ name: 'album_id', path: true }]));
admin.put('/sound/album/:album_id', parse(soundController.putAlbum, [{ name: 'album_id', path: true }, { name: 'data', all: true }]));
admin.del('/sound/album/:album_id', parse(soundController.delAlbum, [{ name: 'album_id', path: true }]));

admin.get('/sound/voices', parse(soundController.listVoice, [{ name: 'album_id', query: true }, { name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/sound/voice', parse(soundController.addVoice, [{ name: 'album_id', body: true }, { name: 'data', all: true }]));
admin.get('/sound/voice/:voice_id', parse(soundController.getVoice, [{ name: 'voice_id', path: true }]));
admin.put('/sound/voice/:voice_id', parse(soundController.putVoice, [{ name: 'voice_id', path: true }, { name: 'data', all: true }]));
admin.del('/sound/voice/:voice_id', parse(soundController.delVoice, [{ name: 'voice_id', path: true }]));

admin.get('/sound/categorys', parse(soundController.listCategory, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/sound/category', parse(soundController.addCategory, [{ name: 'data', all: true }]));
admin.get('/sound/category/:category_id', parse(soundController.getCategory, [{ name: 'category_id', path: true }]));
admin.put('/sound/category/:category_id', parse(soundController.putCategory, [{ name: 'category_id', path: true }, { name: 'data', all: true }]));
admin.del('/sound/category/:category_id', parse(soundController.delCategory, [{ name: 'category_id', path: true }]));

admin.get('/sound/album/:album_id/categorys', parse(soundController.listAlbumCategory, [{ name: 'album_id', path: true }]));
admin.post('/sound/album/:album_id/category', parse(soundController.addAlbumCategory, [{ name: 'album_id', path: true }, { name: 'category_id', form: true }]));
admin.del('/sound/album/:album_id/category', parse(soundController.delAlbumCategory, [{ name: 'album_id', path: true }, { name: 'relation_id', form: true }]));

// book接口
admin.get('/book/albums', parse(bookController.listAlbum, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.get('/book/albums_ids', parse(bookController.listAlbumIds, [{ name: 'ids', query: true, array: true }]));
admin.post('/book/album', parse(bookController.addAlbum, [{ name: 'data', all: true }]));
admin.get('/book/album/:album_id', parse(bookController.getAlbum, [{ name: 'album_id', path: true }]));
admin.put('/book/album/:album_id', parse(bookController.putAlbum, [{ name: 'album_id', path: true }, { name: 'data', all: true }]));
admin.del('/book/album/:album_id', parse(bookController.delAlbum, [{ name: 'album_id', path: true }]));

admin.get('/book/contents', parse(bookController.listContent, [{ name: 'album_id', query: true }, { name: 'page', query: true }, { name: 'keyword', query: true }, { name: 'number', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/book/content', parse(bookController.addContent, [{ name: 'album_id', body: true }, { name: 'data', all: true }]));
admin.get('/book/content/:content_id', parse(bookController.getContent, [{ name: 'content_id', path: true }]));
admin.put('/book/content/:content_id', parse(bookController.putContent, [{ name: 'content_id', path: true }, { name: 'data', all: true }]));
admin.del('/book/content/:content_id', parse(bookController.delContent, [{ name: 'content_id', path: true }]));

admin.get('/book/categorys', parse(bookController.listCategory, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/book/category', parse(bookController.addCategory, [{ name: 'data', all: true }]));
admin.get('/book/category/:category_id', parse(bookController.getCategory, [{ name: 'category_id', path: true }]));
admin.put('/book/category/:category_id', parse(bookController.putCategory, [{ name: 'category_id', path: true }, { name: 'data', all: true }]));
admin.del('/book/category/:category_id', parse(bookController.delCategory, [{ name: 'category_id', path: true }]));

admin.get('/book/album/:album_id/categorys', parse(bookController.listAlbumCategory, [{ name: 'album_id', path: true }]));
admin.post('/book/album/:album_id/category', parse(bookController.addAlbumCategory, [{ name: 'album_id', path: true }, { name: 'category_id', form: true }]));
admin.del('/book/album/:album_id/category', parse(bookController.delAlbumCategory, [{ name: 'album_id', path: true }, { name: 'relation_id', form: true }]));

// base接口
admin.get('/banners', parse(baseController.listBanner, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/banner', parse(baseController.addBanner, [{ name: 'data', all: true }]));
admin.get('/banner/:banner_id', parse(baseController.getBanner, [{ name: 'banner_id', path: true }]));
admin.put('/banner/:banner_id', parse(baseController.putBanner, [{ name: 'banner_id', path: true }, { name: 'data', all: true }]));
admin.del('/banner/:banner_id', parse(baseController.delBanner, [{ name: 'banner_id', path: true }]));

admin.get('/banner/:banner_id/list', parse(baseController.listBannerRelation, [{ name: 'banner_id', path: true }, { name: 'page', query: true }, { name: 'number', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/banner/:banner_id/list', parse(baseController.updateBannerRelation, [{ name: 'banner_id', path: true }, { name: 'module', form: true }, { name: 'ids', form: true, array: true }]));

admin.get('/guides', parse(baseController.listGuide, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.post('/guide', parse(baseController.addGuide, [{ name: 'data', all: true }]));
admin.get('/guide/:guide_id', parse(baseController.getGuide, [{ name: 'guide_id', path: true }]));
admin.put('/guide/:guide_id', parse(baseController.putGuide, [{ name: 'guide_id', path: true }, { name: 'data', all: true }]));
admin.del('/guide/:guide_id', parse(baseController.delGuide, [{ name: 'guide_id', path: true }]));

admin.get('/feedbacks', parse(baseController.listFeedback, [{ name: 'page', query: true }, { name: 'number', query: true }, { name: 'keyword', query: true }, { name: 'order', query: true }, { name: 'direction', query: true }]));
admin.get('/feedback/:feedback_id', parse(baseController.getFeedback, [{ name: 'feedback_id', path: true }]));
admin.del('/feedback/:feedback_id', parse(baseController.delFeedback, [{ name: 'feedback_id', path: true }]));

admin.get('/version/robot', parse(baseController.getVersionRobot));
admin.put('/version/robot', parse(baseController.putVersionRobot, [{ name: 'data', all: true }]));

admin.get('/version/app', parse(baseController.getVersionApp));
admin.put('/version/app', parse(baseController.putVersionApp, [{ name: 'data', all: true }]));

admin.post('/common/upload/base', parse(commonController.ossBaseToken, [{ name: 'path', form: true }]));

export default admin;
