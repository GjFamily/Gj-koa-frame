var routes = require('./routes')
var messages = require('./message')
var middlewares = require('koa-middlewares')
var path = require('path')
var fs = require('fs')
var koa = require('koa')
var config = require('./config')
var logger = require('./tools/logger')
const tools = require('./helps/tools')
const message = require('./helps/message')
tools.extend();
var app = koa();
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
app.use(function*(next) {
  if(this.request.is('multipart/*')) this.disableBodyParser = true;
  return yield next
});
app.use(middlewares.bodyParser());
/**
 * logger
 */
app.use(logger());
if(config.debug) {
  // 跨域
  app.use(function*(next) {
    this.set('Access-Control-Allow-Origin', '*');
    yield next;
  });
  app.use(middlewares.logger())
    // app.use(logger.requestIdContext());
  app.use(logger.print());
}
/**
 * router
 * koa v1 vs router v5
 * koa v2 vs router v7
 */
for(let i in routes) {
  app.use(routes[i].routes())
}
/**
 * error handle
 */
app.on('error', function(err, ctx) {
  console.log(err);
  // this.log.info('server error', err, ctx)
});
// 启动webSocket
let ws = message.koa(app);
for(let i in messages) {
  ws.use(messages[i].events());
}
/**
 * server listen
 */
ws.listen(config.server_port);
/**
 * exit handle
 */
process.on('SIGINT', function(err) {
  process.exit(0)
});
process.on('unhandledRejection', function(err, p) {
  console.error(err.stack)
});