var trade_controller = require('../process/trade');
var pay_model = require('./../../models/pay');
var { ValidException, EmptyException, SystemException, } = require('../../helps/exception');


/**
 * 接受异步通知
 * @param channel
 * @param content
 * @returns {{}}
 */
module.exports.notify = function* ({ channel, content }) {
  let info = yield trade_controller.notify({ channel, content });
  if (!info.id) throw ValidException('支付签名错误');
  let pay = yield pay_model.get(info.id);
  if (!pay) throw ValidException("支付信息不存在");
  let instance = yield getInstance(pay);
  let result = yield trade_controller.server({ instance, pay, info });
  this.body = result.message;
};

/**
 * 同步回调处理
 * @param channel
 * @param content
 */
module.exports.return = function* ({ channel, content }) {
  let info = yield trade_controller.return({ channel, content });
  if (!info.id) throw ValidException('支付签名错误');
  let pay = yield pay_model.get(info.id);
  if (!pay) throw ValidException("支付信息不存在");
  let instance = yield getInstance(pay);
  return yield trade_controller.client({ instance, pay, info });
};

/**
 * 支付状态查询
 * @param id
 */
module.exports.sync = function* ({ id }) {
  if (!id) throw EmptyException('支付信息为空');
  let pay = yield pay_model.get(id);
  if (!pay) throw ValidException("支付信息不存在");
  let instance = yield getInstance(pay);
  let info = yield trade_controller.query({ pay });
  if (!info.id) throw ValidException('支付不存在');
  return yield trade_controller.client({ instance, pay, info });
};


/**
 * 获取支付所对应模块实例
 * @param pay
 * @returns {*}
 */
function* getInstance(pay) {
  switch (pay.module) {
  default:
    throw SystemException('支付模块错误：' + pay.module);
  }
}
