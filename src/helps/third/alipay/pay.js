/* eslint-disable */
/**
 * 条码支付
 * @param pay_id
 * @param auth_code
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param notify_url
 */
module.exports.payTrade = function* ({ pay_id, auth_code, pid, money, subject, body, notify_url }) {
  let data = this.getBaseData();

  data.method = 'alipay.trade.pay';
  data.notify_url = notify_url;
  data.biz_content = {
    out_trade_no: pay_id,
    scene: 'bar_code',
    auth_code: auth_code,
    product_code: 'FACE_TO_FACE_PAYMENT',
    subject: subject,
    seller_id: pid,
    total_amount: money,
    body: body,
    store_id: '',
    timeout_express: '60m',
  };
  if (this.partner_id) {
    data.biz_content.extend_params = {
      sys_service_provider_id: this.partner_id
    };
  }
  let { alipay_trade_pay_response, sign } = yield this.request(data);
  let info = responseTrade(alipay_trade_pay_response, 'success');
  if (info.status == 'success') {
    info.id = info.response.out_trade_no;
    info.transaction_no = info.response.trade_no;
    info.money = info.response.total_amount;
    info.open_id = info.response.buyer_user_id;
  }
};
/**
 * 扫码支付
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param notify_url
 */
module.exports.preTrade = function* ({ pay_id, pid, money, subject, body, notify_url }) {
  let data = this.getBaseData();

  data.method = 'alipay.trade.precreate';
  data.notify_url = notify_url;
  data.biz_content = {
    out_trade_no: pay_id,
    scene: 'bar_code',
    product_code: 'FACE_TO_FACE_PAYMENT',
    subject: subject,
    seller_id: pid,
    total_amount: money,
    body: body,
    store_id: '',
    timeout_express: '60m',
  };
  if (this.partner_id) {
    data.biz_content.extend_params = {
      sys_service_provider_id: this.partner_id
    };
  }
  let { alipay_trade_precreate_response, sign } = yield this.request(data);
  let info = responseTrade(alipay_trade_precreate_response, 'ok');
  if (info.status == 'ok') {
    info.id = info.response.out_trade_no;
    info.request = info.response.qr_code;
  }
};

/**
 * 查询交易
 * @param pay_id
 * @param transaction_no
 * @param pid
 */
module.exports.getTrade = function* ({ pay_id, transaction_no, pid }) {
  let data = this.getBaseData();

  data.method = 'alipay.trade.query';
  data.biz_content = {
    out_trade_no: pay_id,
    trade_no: transaction_no
  };

  let { alipay_trade_query_response, sign } = yield this.request(data);
  let info = responseTrade(alipay_trade_query_response, 'ok');
  if (info.status == 'ok') {
    // 交易状态：WAIT_BUYER_PAY（交易创建，等待买家付款）、TRADE_CLOSED（未付款交易超时关闭，或支付完成后全额退款）、TRADE_SUCCESS（交易支付成功）、TRADE_FINISHED（交易结束，不可退款）
    switch (info.response.trade_status) {
      case 'WAIT_BUYER_PAY':
        info.status = 'wait';
        break;
      case 'TRADE_CLOSE':
        info.status = 'close';
        break;
      case 'TRADE_SUCCESS':
        info.status = 'success';
        break;
      case 'TRADE_FINISHED':
        info.status = 'finish';
        break;
    }
  }
  if (info.status == 'success' || info.status == 'finish') {
    info.id = info.response.out_trade_no;
    info.transaction_no = info.response.trade_no;
    info.money = info.response.total_amount;
    info.open_id = info.response.buyer_user_id;
  }
};

/**
 * 取消交易：交易返回失败或者支付操时，都可以执行取消交易
 * @param pay_id
 * @param transaction_no
 * @param pid
 */
module.exports.cancelTrade = function* ({ pay_id, transaction_no, pid }) {
  let data = this.getBaseData();
  data.method = 'alipay.trade.cancel';
  data.biz_content = {
    out_trade_no: pay_id,
    trade_no: transaction_no
  };

  let { alipay_trade_cancel_response, sign } = yield this.request(data);
  let info = responseTrade(alipay_trade_cancel_response, 'cancel');
  if (info.response.retry_flag != 'N') {
    // 需重新申请撤销
    info.status = 'error';
  } else {
    // 如果是退款，还是cache，如果是close就切换为close
    if (info.response.action == 'close') {
      info.status = 'close';
    }
  }
  return info;
};

/**
 * 关闭交易：等待支付状态才能执行关闭交易
 * @param pay_id
 * @param transaction_no
 * @param pid
 */
module.exports.closeTrade = function* ({ pay_id, transaction_no, pid }) {
  let data = this.getBaseData();
  data.method = 'alipay.trade.close';
  data.biz_content = {
    out_trade_no: pay_id,
    trade_no: transaction_no
  };

  let { alipay_trade_close_response, sign } = yield this.request(data);
  let info = responseTrade(alipay_trade_close_response, 'close');
  return info;
};
/**
 * 交易退款
 * @param pay_id
 * @param transaction_no
 * @param pid
 * @param refund_id
 * @param refund_money
 * @param refund_reason
 */
module.exports.refundTrade = function* ({ pay_id, transaction_no, pid, refund_id, refund_money, refund_reason }) {
  let data = this.getBaseData();
  data.method = 'alipay.trade.refund';
  data.biz_content = {
    out_trade_no: pay_id,
    trade_no: transaction_no,
    out_request_no: refund_id,
    refund_amount: refund_money,
    refund_reason: refund_reason
  };

  let { alipay_trade_refund_response, sign } = yield this.request(data);
  let info = responseTrade(alipay_trade_refund_response, 'refund');
  if (info.status == 'refund') {
    info.id = info.response.out_trade_no;
    info.transaction_no = info.response.trade_no;
  }
  return info;
};

/**
 * wap创建交易
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param return_url
 * @param notify_url
 */
module.exports.wapTrade = function* ({ pay_id, pid, money, subject, body, return_url, notify_url }) {
  let data = this.getBaseData();
  data.method = 'alipay.trade.wap.pay';
  data.return_url = return_url;
  data.notify_url = notify_url;
  data.biz_content = {
    out_trade_no: pay_id,
    product_code: 'QUICK_WAP_PAY',
    subject: subject,
    seller_id: pid,
    total_amount: money,
    body: body,
    store_id: '',
    timeout_express: '60m',
  };
  if (this.partner_id) {
    data.biz_content.extend_params = {
      sys_service_provider_id: this.partner_id
    };
  }
  let info = {
    status: 'ok',
    request: this.execute(data)
  }
  return info;
};

/**
 * app创建交易
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param notify_url
 */
module.exports.appTrade = function* ({ pay_id, pid, money, subject, body, notify_url }) {
  let data = this.getBaseData();
  data.method = 'alipay.trade.app.pay';
  data.notify_url = notify_url;
  data.biz_content = {
    out_trade_no: pay_id,
    product_code: 'QUICK_MSECURITY_PAY',
    subject: subject,
    seller_id: pid,
    total_amount: money,
    body: body,
    store_id: '',
    extend_params: {},
    timeout_express: '60m',
  };
  if (this.partner_id) {
    data.biz_content.extend_params = {
      sys_service_provider_id: this.partner_id
    };
  }
  let info = {
    status: 'ok',
    request: this.execute(data)
  }
  return info;
};

module.exports.notifyTrade = function* (content) {
  // let {notify_time, notify_type, notify_id, app_id, charset, version, sign_type, sign, trade_no, out_trade_no, out_biz_no, buyer_id, buyer_logon_id, seller_id, seller_email, trade_status, total_amount, receipt_amount, invoice_amount, buyer_pay_amount, point_amount, refund_fee, subject, body, gmt_create, gmt_payment, gmt_refund, gmt_close, fund_bill_list, passback_params, voucher_detail_list} = content;
  let info = {
    response: content
  };
  if (!this.validSignature(content)) {
    info.status = 'system';
    return info;
  }
  switch (info.response.trade_status) {
    case 'WAIT_BUYER_PAY':
      info.status = 'wait';
      break;
    case 'TRADE_CLOSE':
      info.status = 'close';
      break;
    case 'TRADE_SUCCESS':
      info.status = 'success';
      break;
    case 'TRADE_FINISHED':
      info.status = 'finish';
      break;
  }

  info.id = info.response.out_trade_no;
  info.transaction_no = info.response.trade_no;
  info.money = info.response.total_amount;
  info.open_id = info.response.buyer_id;
  info.message = successTrade();
  info.app_id = this.app_id;
  return info;
};

module.exports.returnTrade = function* (content) {
  let info = {
    response: content
  };
  if (!this.validSignature(content)) {
    info.status = 'system';
    return info;
  }

  if (info.response.code) {
    // 手机返回
    // let {out_trade_no, trade_no, app_id, total_amount, seller_id, msg, charset, timestamp, code} = content;
    switch (info.response.code) {
      case '9000':
        info.status = 'wait';
        info.id = info.response.out_trade_no;
        info.transaction_no = info.response.trade_no;
        info.money = info.response.total_amount;
        break;
      case '6004':
      case '8000':
        info.status = 'wait';
        info.message = '支付处理中';
        break;
      case '4000':
        info.status = 'error';
        info.message = '支付失败';
        break;
      case '6001':
        info.status = 'error';
        info.message = '用户取消支付';
        break;
      case '6002':
        info.status = 'system';
        info.message = '网络链接错误';
        break;
      case '5000':
      default:
        info.status = 'system';
        info.message = '请联系管理员';
    }
  } else {
    // wap返回
    // let {app_id, method, sign_type, sign, charset, timestamp, version, out_trade_no, trade_no, total_amount, seller_id} = content;
    info.status = 'wait';
    info.id = info.response.out_trade_no;
    info.transaction_no = info.response.trade_no;
    info.money = info.response.total_amount;
  }
  return info;
};

module.exports.validTrade = function* ({ response, request }) {
  if (response.app_id != request.app_id) return false;
  return true;
};

var successTrade = function () {
  return 'success';
};

var responseTrade = function (response, success_status) {
  switch (response.code) {
    case 10000: // 调用接口成功
      return formatReturn(success_status, '', response);
    case 40004: // 业务处理失败
      switch (response.sub_code) {
        case 'ACQ.EXIST_FORBIDDEN_WORD':
          return formatReturn('error', response.sub_msg, response);
        case 'ACQ.TRADE_HAS_SUCCESS':
          return formatReturn('success', '', response);
        case 'ACQ.TRADE_HAS_CLOSE':
          return formatReturn('close', '当前订单已关闭，请重新支付', response);
        case 'ACQ.BUYER_BALANCE_NOT_ENOUGH':
          return formatReturn('error', '用户余额不足', response);
        case 'ACQ.BUYER_BANKCARD_BALANCE_NOT_ENOUGH':
          return formatReturn('error', '用户余额不足', response);
        case 'ACQ.ERROR_BALANCE_PAYMENT_DISABLE':
          return formatReturn('error', '余额支付需开启', response);
        case 'ACQ.BUYER_SELLER_EQUAL':
          return formatReturn('error', '买卖家不能相同', response);
        case 'ACQ.TRADE_BUYER_NOT_MATCH':
          return formatReturn('error', '交易买家不匹配', response);
        case 'ACQ.BUYER_ENABLE_STATUS_FORBID':
          return formatReturn('error', '用户状态非法', response);
        case 'ACQ.PULL_MOBILE_CASHIER_FAIL':
          return formatReturn('error', '请重新支付', response);
        case 'ACQ.MOBILE_PAYMENT_SWITCH_OFF':
          return formatReturn('error', '请开启无线支付功能', response);
        case 'ACQ.PAYMENT_FAIL':
          return formatReturn('error', '系统错误，请重新支付', response);
        case 'ACQ.BUYER_PAYMENT_AMOUNT_DAY_LIMIT_ERROR':
          return formatReturn('error', '买家付款日限额超限', response);
        case 'ACQ.BEYOND_PAY_RESTRICTION':
          return formatReturn('error', '商家收款额度超限', response);
        case 'ACQ.BEYOND_PER_RECEIPT_RESTRICTION':
          return formatReturn('error', '商家月收款额度超限', response);
        case 'ACQ.BUYER_PAYMENT_AMOUNT_MONTH_LIMIT_ERROR':
          return formatReturn('error', '买家月支付额度超限', response);
        case 'ACQ.SELLER_BEEN_BLOCKED':
          return formatReturn('error', '商家账号被冻结', response);
        case 'ACQ.ERROR_BUYER_CERTIFY_LEVEL_LIMIT':
          return formatReturn('error', '买家未通过人行认证', response);
        case 'ACQ.PAYMENT_REQUEST_HAS_RISK':
          return formatReturn('error', '支付方式存在风险', response);
        case 'ACQ.NO_PAYMENT_INSTRUMENTS_AVAILABLE':
          return formatReturn('error', '没有可用的支付工具', response);
        case 'ACQ.USER_FACE_PAYMENT_SWITCH_OFF':
          return formatReturn('error', '请开启当面付款开关', response);
        case 'ACQ.SELLER_BALANCE_NOT_ENOUGH':
          return formatReturn('error', '商户的支付宝账户中无足够的资金进行撤销', response);
        case 'ACQ.REASON_TRADE_BEEN_FREEZEN':
          return formatReturn('exception', '当前交易被冻结，不允许进行撤销', response);
        case 'ACQ.TRADE_NOT_EXIST': //query
          return formatReturn('close', '查询的交易不存在，请重新支付', response);
        default:
          return formatReturn('system', response.sub_msg, response);
      }
    case 20000: // 服务不可用
      return formatReturn('wait', '等待支付处理', response);
    case 20001: // 授权权限不足
    case 40001: // 缺少必要参数
    case 40002: // 非法参数
    case 40006: // 权限不足
      return formatReturn('system', response.msg, response);
  }
};
var formatReturn = function (status, message, response) {
  return {
    status: status,
    message: message,
    response: response,
    id: response.out_trade_no,
    transaction_no: response.trade_no,
    money: response.total_amount,
    open_id: response.buyer_id
  }
}
