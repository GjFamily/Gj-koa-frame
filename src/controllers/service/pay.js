const trade_controller = require('../process/trade');
const pay_model = require('./../../models/pay');
const { ValidException, EmptyException, SystemException } = require('../../helps/exception');


/**
 * 获取支付所对应模块实例
 * @param pay
 * @returns {*}
 */
function* getInstance(pay) {
  switch (pay.module) {
    default: throw SystemException(`支付模块错误：${pay.module}`);
  }
}

/**
 * 接受异步通知
 * @param channel
 * @param content
 * @returns {{}}
 */
module.exports.notify = function* ({ channel, content }) {
  const info = yield trade_controller.notify({ channel, content });
  if (!info.id) throw ValidException('支付签名错误');
  const pay = yield pay_model.get(info.id);
  if (!pay) throw ValidException('支付信息不存在');
  const instance = yield getInstance(pay);
  const result = yield trade_controller.server({ instance, pay, info });
  this.body = result.message;
};

/**
 * 同步回调处理
 * @param channel
 * @param content
 */
module.exports.return = function* ({ channel, content }) {
  const info = yield trade_controller.return({ channel, content });
  if (!info.id) throw ValidException('支付签名错误');
  const pay = yield pay_model.get(info.id);
  if (!pay) throw ValidException('支付信息不存在');
  const instance = yield getInstance(pay);
  return yield trade_controller.client({ instance, pay, info });
};

/**
 * 支付状态查询
 * @param id
 */
module.exports.sync = function* ({ id }) {
  if (!id) throw EmptyException('支付信息为空');
  const pay = yield pay_model.get(id);
  if (!pay) throw ValidException('支付信息不存在');
  const instance = yield getInstance(pay);
  const info = yield trade_controller.query({ pay });
  if (!info.id) throw ValidException('支付不存在');
  return yield trade_controller.client({ instance, pay, info });
};
