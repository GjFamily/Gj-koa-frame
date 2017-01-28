var routes = require('./routes')
var middlewares = require('koa-middlewares')
var path = require('path')
var koa = require('koa')
var config = require('./config')
var app = koa()

/**
 * ignore favicon
 */
app.use(middlewares.favicon())

/**
 * response time header
 */
app.use(middlewares.rt())

/**
 * body
 */
app.use(middlewares.bodyParser())

/**
 * logger
 */
if (config.debug) {
  app.use(middlewares.logger())
}

/**
 * router
 * koa v1 vs router v5
 * koa v2 vs router v7
 */
for (let i in routes) {
  app.use(routes[i].routes())
}

/**
 * error handle
 */
app.on('error', function(err, ctx){
  log.error('server error', err, ctx)
})

/**
 * server listen
 */
app.listen(config.server_port)

/**
 * exit handle
 */
process.on('SIGINT', function(err) {
  process.exit(0)
});
