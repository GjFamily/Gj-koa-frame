const routes = require('./routes');
const messages = require('./messages');
const middlewares = require('koa-middlewares');
// const path = require('path');
// const fs = require('fs');
const koa = require('koa');
const config = require('./config');
const logger = require('./tools/logger');
const tools = require('./helps/tools');
const message = require('./helps/message');

tools.extend();
const app = koa();
/**
 * ignore favicon
 */
app.use(middlewares.favicon());
/**
 * response time header
 */
app.use(middlewares.rt());
/**
 * body
 */
app.use(function* middleware(next) {
  if (this.request.is('multipart/*')) this.disableBodyParser = true;
  return yield next;
});
app.use(middlewares.bodyParser());
/**
 * logger
 */
app.use(logger());
if (config.debug) {
  // 跨域
  app.use(function* middleware(next) {
    this.set('Access-Control-Allow-Origin', '*');
    yield next;
  });
  app.use(middlewares.logger());
  // app.use(logger.requestIdContext());
  app.use(logger.print());
}
/**
 * router
 * koa v1 vs router v5
 * koa v2 vs router v7
 */
routes.forEach((route) => {
  app.use(route.routes());
});
/**
 * error handle
 */
app.on('error', (err) => {
  console.log(err);
  // this.log.info('server error', err, ctx)
});
// 启动webSocket
const ws = message.koa(app);
messages.forEach((m) => {
  ws.use(m.events());
});
/**
 * server listen
 */
ws.listen(config.server_port);
/**
 * exit handle
 */
process.on('SIGINT', () => {
  process.exit(0);
});
process.on('unhandledRejection', (err) => {
  console.error(err.stack);
});
