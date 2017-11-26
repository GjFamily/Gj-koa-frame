/**
 * Created by gaojie on 2017/4/1.
 */
var pay_controller = require('../controllers/service/pay');
var parse = require('../helps/controller');
var middlewares = require('koa-middlewares');
var Router = require('koa-router');

var gateway = Router({
  prefix: '/gateway'
});

var pay = Router({
  prefix: '/pay'
});
// 异步支付通知
pay.post('/weixin_lite',
  parse([pay_controller.notify], [
    { name: "channel", default: 'weixin_lite' },
    { name: "content", all: true }]
  ));

var oauth = Router({
  prefix: 'oauth'
});
// 用户授权

var message = Router({
  prefix: 'message'
});
// 异步通知
pay.post('/weixin',
parse([pay_controller.notify], [
  { name: "channel", default: 'weixin_lite' },
  { name: "content", all: true }]
));

gateway.use(pay.routes());
gateway.use(oauth.routes());
gateway.use(message.routes());

module.exports = gateway;