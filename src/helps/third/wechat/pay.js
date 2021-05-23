/* eslint-disable */
const xml2js = require('xml2js');

/**
 * Marshalling object keys to be sorted alphabetically and then translated to url parameters
 *
 * @param params
 * @returns {string}
 */
const marshall = function (params) {
  params = params || {};
  const keys = Object.keys(params).sort();
  const obj = {};
  const kvs = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (params[k]) {
      obj[k] = params[k];
      kvs.push(`${keys[i]}=${params[k]}`);
    }
  }
  return kvs.join('&');
};
const toXml = function (params) {
  const lines = [];
  lines.push('<xml>');
  for (let k in params) {
    if (!params[k]) {
      continue;
    }
    if (typeof params[k] === 'number') {
      lines.push('<' + k + '>' + params[k] + '</' + k + '>');
    } else {
      lines.push('<' + k + '><![CDATA[' + params[k] + ']]></' + k + '>');
    }
  }
  lines.push('</xml>');
  return lines.join('');
}
var responseTrade = function (response, success_status) {
  switch (response.return_code) {
    case 'SUCCESS':
      if (response.result_code == 'SUCCESS') {
        return formatReturn(success_status, '', response);
      }
      switch (response.err_code) {
        case 'SYSTEMERROR':
          return formatReturn('wait', '等待支付处理', response);
        case 'USERPAYING':
          return formatReturn('wait', '用户支付中，需要输入密码', response);
        case 'BANKERROR':
          return formatReturn('wait', '等待银行结果', response);
        case 'NOTENOUGH':
          return formatReturn('exception', '用户余额不足', response);
        case 'AUTHCODEEXPIRE':
          return formatReturn('exception', '二维码已过期，请用户在微信上刷新后再试', response);
        case 'NOTSUPORTCARD':
          return formatReturn('exception', '用户使用卡种不支持当前支付形式', response);
        case 'ORDERPAID':
          return formatReturn('success', '', response);
        case 'ORDERCLOSED':
          return formatReturn('close', '当前订单已关闭，请重新支付', response);
        case 'ORDERREVERSED':
          return formatReturn('cancel', '已撤销，请重新支付', response);
        case 'REVERSE_EXPIRE': // cancel
          return formatReturn('exception', '支付满7天，无法撤销', response);
        case 'ORDERNOTEXIST': // query
          return formatReturn('close', '查询的交易不存在，请重新支付', response);
        default:
          return formatReturn('system', response.err_code_des, response);
      }
    default:
      return formatReturn('system', response.return_msg, response);
  }
};
var formatReturn = function (status, message, response) {
  return {
    status: status,
    message: message,
    response: response,
    id: response.out_trade_no,
    transaction_no: response.transaction_id,
    money: parseFloat(response.total_fee) / 100,
    open_id: response.openid
  }
}

function getTradeSignature(params, key) {
  const temp = marshall(params) + '&key=' + key;
  return temp.md5().toUpperCase();
}

function* tradeRequest(client, url, data, encrypt = false) {
  const a = data;
  let options;
  if (encrypt) {
    options = {
      securityOptions: 'SSL_OP_NO_SSLv3',
      pfx: new Buffer(client.pfx, 'base64'),
      passphrase: client.passphrase,
    };
  }
  const headers = {
    'Content-Type': 'text/xml',
  };

  // data.sign_type = 'MD5';
  a.sign = getTradeSignature(data, client.app_key);
  let content = yield client.payPost(url, toXml(data), headers, options);
  return yield parseXML(content);
}

module.exports.unifiedTrade = function* ({ pay_id, pid, money, subject, body, ip, notify_url, trade_type, open_id = null }) {
  let data = {
    appid: this.app_id,
    mch_id: pid ? pid : this.pid,
    nonce_str: getNonce(),
    body: subject,
    detail: body,
    out_trade_no: pay_id,
    total_fee: money * 100,
    notify_url: notify_url,
    trade_type: trade_type,
    spbill_create_ip: ip
  }
  if (trade_type == 'JSAPI') {
    data.openid = open_id;
  }
  if (this.partner_id) {
    data.mch_id = this.partner_id;
    data.sub_mch_id = pid;
  }
  let response = yield tradeRequest(this, '/pay/unifiedorder', data);
  let info = responseTrade(response, 'ok');
  if (info.status == 'ok') {
    // 重置返回信息，用于return函数处理
    info = {
      status: 'ok',
      appid: this.app_id,
      out_trade_no: pay_id,
      transaction_id: info.transaction_no,
      total_fee: money,
      openid: open_id,
      response: info.response
    }
  }
  return info;
};

module.exports.payTrade = function* ({ pay_id, auth_code, pid, money, subject, body, ip }) {
  let data = {
    appid: this.app_id,
    mch_id: pid ? pid : this.pid,
    nonce_str: getNonce(),
    body: subject,
    detail: body,
    out_trade_no: pay_id,
    total_fee: money,
    auth_code: auth_code,
    spbill_create_ip: ip
  }
  if (this.partner_id) {
    data.mch_id = this.partner_id;
    data.sub_mch_id = pid;
  }
  let response = yield tradeRequest(this, '/pay/micropay', data);
  let info = responseTrade(response, 'success');
  return info;
};

/**
 * 用户扫码支付
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param ip
 * @param notify_url
 * @returns {{appid: (*|string|string|string), nonce_str, timeStamp, package: string}}
 */
module.exports.preTrade = function* ({ pay_id, pid, money, subject, body, ip, notify_url }) {
  let info = yield this.unifiedTrade({ pay_id, pid, money, subject, body, ip, notify_url, trade_type: 'NATIVE' })
  if (info.status == 'ok') {
    info.request = info.response.code_url;
    info.response = null;
  }
  return info;
};

module.exports.getTrade = function* ({ pay_id, transaction_no, pid }) {
  let data = {
    appid: this.app_id,
    mch_id: pid ? pid : this.pid,
    out_trade_no: pay_id,
    transaction_id: transaction_no,
    nonce_str: getNonce(),
  }
  if (this.partner_id) {
    data.mch_id = this.partner_id;
    data.sub_mch_id = pid;
  }
  let response = yield tradeRequest(this, '/pay/orderquery', data);
  let info = responseTrade(response, 'ok');
  if (info.status == 'ok') {
    /**
     * SUCCESS—支付成功
     REFUND—转入退款
     NOTPAY—未支付
     CLOSED—已关闭
     REVOKED—已撤销(刷卡支付)
     USERPAYING--用户支付中
     PAYERROR--支付失败(其他原因，如银行返回失败)
     */
    switch (info.response.trade_state) {
      case 'SUCCESS':
        info.status = 'success';
        break;
      case 'REFUND':
        info.status = 'refund';
        break;
      case 'NOTPAY':
        info.status = 'wait';
        break;
      case 'REVOKED':
        info.status = 'cancel';
        break;
      case 'USERPAYING':
        info.status = 'wait';
        break;
      case 'PAYERROR':
        info.status = 'error';
        break;
    }
  }
  return info;
};

/**
 * 撤销交易：支付交易返回失败或支付系统超时，调用该接口撤销交易。如果此订单用户支付失败，微信支付系统会将此订单关闭；如果用户支付成功，微信支付系统会将此订单资金退还给用户。
 * @param pay_id
 * @param transaction_no
 * @param pid
 */
module.exports.cancelTrade = function* ({ pay_id, transaction_no, pid }) {
  let data = {
    appid: this.app_id,
    mch_id: pid ? pid : this.pid,
    out_trade_no: pay_id,
    transaction_id: transaction_no,
    nonce_str: getNonce(),
  }
  if (this.partner_id) {
    data.mch_id = this.partner_id;
    data.sub_mch_id = pid;
  }
  let response = yield tradeRequest(this, 'secapi/pay/reverse', data, true);
  return responseTrade(response, 'cancel');
};
/**
 * 关闭订单：商户订单支付失败需要生成新单号重新发起支付，要对原订单号调用关单，避免重复支付；系统下单后，用户支付超时，系统退出不再受理，避免用户继续，请调用关单接口。
 * @param pay_id
 * @param transaction_no
 * @param pid
 */
module.exports.closeTrade = function* ({ pay_id, transaction_no, pid }) {
  // 有部分接口不返回订单号，所以统一用
  let data = {
    appid: this.app_id,
    mch_id: pid ? pid : this.pid,
    out_trade_no: pay_id,
    nonce_str: getNonce(),
  }
  if (this.partner_id) {
    data.mch_id = this.partner_id;
    data.sub_mch_id = pid;
  }
  let response = yield tradeRequest(this, '/pay/closeorder', data);
  let info = responseTrade(response, 'close');
  // status 为 close为关闭成功，交易不存在，也设定为已关闭
  return info;
}

module.exports.refundTrade = function* ({ pay_id, transaction_no, pid, money, refund_id, refund_money, refund_reason }) {
  let data = {
    appid: this.app_id,
    mch_id: pid ? pid : this.pid,
    out_trade_no: pay_id,
    transaction_id: transaction_no,
    out_refund_no: refund_id,
    total_fee: money,
    refund_fee: refund_money,
    nonce_str: getNonce(),
  }
  if (this.partner_id) {
    data.mch_id = this.partner_id;
    data.sub_mch_id = pid;
  }
  let response = yield tradeRequest(this, '/secapi/pay/refund', data, true);
  return responseTrade(response, 'refund');
}

/**
 * 网页端调起js
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param ip
 * @param notify_url
 * @returns {{appid: (*|string|string|string), nonce_str, timeStamp, package: string}}
 */
module.exports.jsTrade = function* ({ pay_id, pid, money, subject, body, ip, notify_url, open_id }) {
  let info = yield this.unifiedTrade({ pay_id, pid, money, subject, body, ip, notify_url, trade_type: 'JSAPI', open_id })
  if (info.status == 'ok') {
    let data = {
      appId: this.app_id,
      nonceStr: getNonce(),
      timeStamp: Date.nowTime().toString(),
      signType: 'MD5',
      package: 'prepay_id=' + info.response.prepay_id
    }
    data.paySign = getTradeSignature(data, this.app_key);

    // 只用将data参数提交，返回值写入info.code，将info返回
    info.request = data;
    info.response = null;
  }
  return info
};
/**
 * wap网页端跳转
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param ip
 * @param notify_url
 * @returns {{appid: (*|string|string|string), nonce_str, timeStamp, package: string}}
 */
module.exports.wapTrade = function* ({ pay_id, pid, money, subject, body, ip, notify_url }) {
  let info = yield this.unifiedTrade({ pay_id, pid, money, subject, body, ip, notify_url, trade_type: 'MWEB' })
  if (info.status == 'ok') {
    // 只用将data参数提交，返回值写入info.code，将info返回
    info.request = mweb_url;
    info.response = null;
  }
  return info
};
/**
 * app端调用
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param ip
 * @param notify_url
 * @returns {{appid: (*|string|string|string), partnerid: *, prepayid: *, package: string, nonce_str, timestamp}}
 */
module.exports.appTrade = function* ({ pay_id, pid, money, subject, body, ip, notify_url }) {
  let info = yield this.unifiedTrade({ pay_id, pid, money, subject, body, ip, notify_url, trade_type: 'APP' })
  if (info.status == 'ok') {
    let data = {
      appid: config.app_id,
      partnerid: pid ? pid : this.pid,
      prepayid: info.response.prepay_id,
      package: 'Sign=WXPay',
      nonce_str: getNonce(),
      timestamp: Date.nowTime(),
    }
    data.paySign = getTradeSignature(data, this.app_key);

    // 只用将data参数提交，返回值写入info.code，将info返回
    info.request = data;
    info.response = null;
  }
  return info
};
/**
 * 小程序端调用
 * @param pay_id
 * @param pid
 * @param money
 * @param subject
 * @param body
 * @param ip
 * @param notify_url
 * @returns {{appid: (*|string|string|string), partnerid: *, prepayid: *, package: string, nonce_str, timestamp}}
 */
module.exports.liteTrade = function* ({ pay_id, pid, money, subject, body, ip, notify_url, open_id }) {
  let info = yield this.unifiedTrade({ pay_id, pid, money, subject, body, ip, notify_url, trade_type: 'JSAPI', open_id })
  if (info.status == 'ok') {
    let data = {
      appId: this.app_id,
      // partnerid: pid,
      package: 'prepay_id=' + info.response.prepay_id,
      nonceStr: getNonce(),
      timeStamp: `${Date.nowTime()}`,
      signType: "MD5"
    }
    data.paySign = getTradeSignature(data, this.app_key);
    delete data.appId

    // 只用将data参数提交，返回值写入info.code，将info返回
    info.request = data;
    info.response = null;
  }
  return info
};
/**
 * 支付完成后的异步通知
 * @param content
 * @returns {boolean}
 */
module.exports.notifyTrade = function* (content) {
  content = yield parseXML(content);
  if (!(yield signCheck(this, content))) return false;
  // let {appid, mch_id, sub_appid, sub_mch_id, device_info, nonce_str, sign, result_code, err_code, err_code_des, openid, is_subscribe, trade_type, bank_type, total_fee, fee_type, cash_fee, cash_fee_type, coupon_fee, coupon_count, transaction_id, out_trade_no, attach, time_end} = content;

  let info = responseTrade(content, 'success');
  info.message = successTrade();
  return info;
};

module.exports.validTrade = function* ({ response, request }) {
  if (response.app_id != request.app_id) return false;
  return true;
};
/**
 * 处理前端返回：将返回信息写入code，后原样返回
 * @param content
 * @returns {{response: *}}
 */
module.exports.returnTrade = function* (content) {
  let info = {
    response: content
  }
  if (info.response.indexOf('get_brand_wcpay_request') == 0) {
    // wap返回
    switch (info.response) {
      case 'get_brand_wcpay_request:ok':
        info.status = 'wait';
        break;
      case 'get_brand_wcpay_request:fail':
        info.status = 'system';
        break;
      case 'get_brand_wcpay_request:cancel':
        info.status = 'system';
        break;
      default:
        info.status = 'system';
    }
  } else {
    // app返回
    switch (info.response.toString()) {
      case '0':
        info.status = 'wait';
        break;
      case '-1':
        info.status = 'system';
        break;
      case '-2':
        info.status = 'system';
        break;
      default:
        info.status = 'system';
    }
  }
  return info;
};

var successTrade = function () {
  return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
};

function* signCheck(client, content) {
  let sign = content.sign;
  delete content.sign;
  let sign_self = getTradeSignature(content, client.app_key);
  return sign_self == sign;
}

/**
 * 解析xml格式未数组
 * @param content
 * @returns {Promise}
 */
function parseXML(content) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(content, { explicitArray: false, ignoreAttrs: true }, function (err, json) {
      if (err) {
        reject(err);
      } else {
        resolve(json.xml);
      }
    });
  })
}

var getNonce = function () {
  return String(Date.nowTime()).md5();
};

/**
 * Translate object to url parameters
 *
 * @param params
 * @returns {string}
 */
var toParam = function (params) {
  params = params || {};
  var keys = [];
  for (var k in params) {
    if (['string', 'number'].indexOf(typeof params[k]) !== -1) {
      keys.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    }
  }
  return keys.join('&');
};
