const { Model, Schema } = require('../helps/model');

const uid = require('uid-safe');

const CHANNEL = {
  alipay_app: 'alipay_app', // 支付宝app
  alipay_wap: 'alipay_wap', // 支付宝手机网页
  alipay_pc: 'alipay_pc', // 支付宝电脑网站支付
  alipay_bar: 'alipay_bar', // 支付宝当面付，条码支付
  alipay_qr: 'alipay_qr', // 支付宝用户扫码支付
  weixin_app: 'weixin_app', // 微信 APP 支付
  weixin_js: 'weixin_js', // 微信公众号支付
  weixin_bar: 'weixin_bar', // 微信公众号条码支付
  weixin_wap: 'weixin_wap', // 微信 WAP 支付
  weixin_qr: 'weixin_qr', // 微信用户扫码支付
  weixin_lite: 'weixin_lite', // 微信小程序支付
  test: 'test', // 测试渠道
  cash: 'cash', // 现金
};

// 模块需要获取pay_id,支持pay和payed接口
// 模块需要account_id或者store_id 表明是商户收款
// 模块有self，表明是自身收款
const MODULE = {

};

const TRADE_STATUS = {
  WAIT_BUYER_PAY: 0,
  SUCCESS: 1,
  CANCEL: 2,
  FINISH: 3,
  ERROR: 4,
  CLOSE: 5,
  SYSTEM: 6,
  EXCEPTION: 7,
};
const TRADE_STATUS_MAP = {
  [TRADE_STATUS.WAIT_BUYER_PAY]: '等待付款',
  [TRADE_STATUS.SUCCESS]: '交易成功',
  [TRADE_STATUS.CANCEL]: '交易取消',
  [TRADE_STATUS.FINISH]: '交易完成',
  [TRADE_STATUS.ERROR]: '交易错误，撤单/关闭失败，需重试',
  [TRADE_STATUS.CLOSE]: '交易关闭',
  [TRADE_STATUS.SYSTEM]: '系统错误',
  [TRADE_STATUS.EXCEPTION]: '交易异常',
};

const schema = new Schema({
  primary: 'id',
  create_time: true,
  update_time: true,
  fields: ['id', 'channel', 'client_ip', 'money', 'module', 'module_id', 'pid', 'subject', 'body', 'transaction_no', 'currency', 'trade_status', 'pay_time', 'pay_info', 'result_info'],
  default: {},
});
/**
 * 快速完成
 * @returns {*}
 */
schema.methods.fast = function () {
  const transaction_no = uid.sync(24);
  const result_info = {};
  return this.payed(transaction_no, result_info);
};
/**
 * 支付完成
 * @param transaction_no
 * @param result_info
 * @param finish
 * @returns {*}
 */
schema.methods.payed = function (transaction_no, result_info, finish = false) {
  this.transaction_no = transaction_no;
  this.result_info = JSON.stringify(result_info);
  this.pay_time = Date.nowTime();
  this.trade_status = finish ? TRADE_STATUS.FINISH : TRADE_STATUS.SUCCESS;
  return this.save();
};
/**
 * 支付取消
 */
schema.methods.cancel = function (transaction_no, result_info) {
  this.transaction_no = transaction_no;
  this.result_info = JSON.stringify(result_info);
  this.trade_status = TRADE_STATUS.CANCEL;
  return this.save();
};
/**
 * 支付取消失败，需要再次取消
 * @param transaction_no
 * @param result_info
 * @returns {*}
 */
schema.methods.error = function (transaction_no, result_info) {
  this.transaction_no = transaction_no;
  this.result_info = JSON.stringify(result_info);
  this.trade_status = TRADE_STATUS.ERROR;
  return this.save();
};
/**
 * 支付关闭
 * @param transaction_no
 * @param result_info
 * @returns {*}
 */
schema.methods.close = function (transaction_no, result_info) {
  this.transaction_no = transaction_no;
  this.result_info = JSON.stringify(result_info);
  this.trade_status = TRADE_STATUS.CLOSE;
  return this.save();
};
/**
 * 支付接口错误
 * @param result_info
 * @returns {*}
 */
schema.methods.system = function (result_info) {
  this.result_info = JSON.stringify(result_info);
  this.trade_status = TRADE_STATUS.SYSTEM;
  return this.save();
};
/**
 * 支付流程异常
 * @param result_info
 * @returns {*}
 */
schema.methods.exception = function (result_info) {
  this.result_info = JSON.stringify(result_info);
  this.trade_status = TRADE_STATUS.EXCEPTION;
  return this.save();
};
/**
 * 填充支付信息
 * @returns {{id: *, module: *, module_id: *}}
 */
schema.methods.setInfo = function (info) {
  this.pay_info = JSON.stringify(info);
  this.trade_status = TRADE_STATUS.WAIT_BUYER_PAY;
  return this.save();
};
/**
 * 获取支付信息
 */
schema.methods.getInfo = function () {
  return this.pay_info ? JSON.parse(this.pay_info) : {};
};
/**
 * 获取返回信息
 */
schema.methods.getResult = function () {
  return this.result_info ? JSON.parse(this.result_info) : {};
};

/**
 * 返回支付状态
 * @returns {boolean}
 */
schema.methods.getPayStatus = function () {
  return TRADE_STATUS_MAP[this.trade_status];
};
/**
 * 判断该支付是否成功
 * @returns {boolean}
 */
schema.methods.isPayed = function () {
  return this.trade_status === TRADE_STATUS.SUCCESS ||
   this.trade_status === TRADE_STATUS.FINISH;
};
/**
 * 判断该支付是否在支付中
 * @returns {boolean}
 */
schema.methods.isPaying = function () {
  return this.trade_status === TRADE_STATUS.WAIT_BUYER_PAY ||
   this.trade_status === TRADE_STATUS.ERROR;
};
/**
 * 判断该支付是否无效
 * @returns {boolean}
 */
schema.methods.isInvalid = function () {
  return this.trade_status === TRADE_STATUS.CLOSE ||
  this.trade_status === TRADE_STATUS.CANCEL ||
  this.trade_status === TRADE_STATUS.SYSTEM ||
  this.trade_status === TRADE_STATUS.EXCEPTION;
};
/**
 * 判断该支付是否需要再次撤销
 * @returns {boolean}
 */
schema.methods.isError = function () {
  return this.trade_status === TRADE_STATUS.ERROR;
};

const model = new Model('pay', schema);

/**
 * 创建支付
 * @param money
 * @param channel
 * @param module
 * @param module_id
 * @param pid
 * @param subject
 * @param body
 * @param client_ip
 * @param currency
 * @returns {*}
 */
model.make = function (money, channel, module, module_id, pid, subject, body, client_ip, currency = 'cny') {
  return this.insert({
    id: uid.sync(24),
    channel,
    money,
    module,
    module_id,
    pid,
    client_ip,
    subject,
    body,
    transaction_no: '',
    currency,
    trade_status: TRADE_STATUS.WAIT_BUYER_PAY,
    pay_time: 0,
    pay_info: '',
    result_info: '',
  });
};

/**
 * 获取支付
 * @param id
 * @returns {*}
 */
model.get = function (id) {
  return this.getByKey(id);
};

module.exports = model;
module.exports.CHANNEL = CHANNEL;
module.exports.MODULE = MODULE;
