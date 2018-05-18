/**
 * Created by gaojie on 2017/4/3.
 */
const config = require('./../../config');
const weixin_client = require('./../../helps/third/weixin');
const alipay_client = require('./../../helps/third/alipay');

const pay_model = require('./../../models/pay');
const { ValidException, EmptyException, SystemException } = require('../../helps/exception');

weixin_client.payInit(config.weixin.pid, config.weixin.app_key);
// 统一处理第三方交易流程
const SOURCE = {
  WEIXIN: weixin_client.source,
  // ALIPAY: alipay.source,
  LOCAL: 'local',
};

const CHANNEL_MAP = {
  [pay_model.CHANNEL.alipay_app]: SOURCE.ALIPAY,
  [pay_model.CHANNEL.alipay_pc]: SOURCE.ALIPAY,
  [pay_model.CHANNEL.alipay_wap]: SOURCE.ALIPAY,
  [pay_model.CHANNEL.alipay_bar]: SOURCE.ALIPAY,
  [pay_model.CHANNEL.alipay_qr]: SOURCE.ALIPAY,
  [pay_model.CHANNEL.weixin_app]: SOURCE.WEIXIN,
  [pay_model.CHANNEL.weixin_js]: SOURCE.WEIXIN,
  [pay_model.CHANNEL.weixin_wap]: SOURCE.WEIXIN,
  [pay_model.CHANNEL.weixin_bar]: SOURCE.WEIXIN,
  [pay_model.CHANNEL.weixin_lite]: SOURCE.WEIXIN,
  [pay_model.CHANNEL.weixin_qr]: SOURCE.WEIXIN,
  [pay_model.CHANNEL.cash]: SOURCE.LOCAL,
  [pay_model.CHANNEL.test]: SOURCE.LOCAL,
};

const SOURCE_MAP = {
  [SOURCE.WEIXIN]: '微信支付',
  [SOURCE.ALIPAY]: '支付宝支付',
  [SOURCE.LOCAL]: '现金',
};

const trade = {};

/**
 * 获取第三方
 * @param channel
 */
function getHandle(channel) {
  switch (channel) {
    case SOURCE.WEIXIN:
      return weixin_client;
      // case SOURCE.ALIPAY:
      //   return alipay_client;
    default:
      if (CHANNEL_MAP[channel]) return getHandle(CHANNEL_MAP[channel]);
      throw ValidException('第三方支付错误');
  }
}

/**
 * 关闭支付
 * @param pay
 * @param info
 * @returns {*}
 */
function* end(pay, info) {
  const { channel, id, transaction_no, pid } = pay;
  const pay_id = id;
  let result;
  // 根据渠道选择是撤销还是关闭操作
  // 需要对不存在的交易直接返回关闭操作，简化逻辑处理
  if (channel === pay_model.CHANNEL.alipay_bar || channel === pay_model.CHANNEL.alipay_qr) {
    result = yield alipay_client.cancelTrade({ pay_id, transaction_no, pid });
  } else if (channel === pay_model.CHANNEL.alipay_app ||
    channel === pay_model.CHANNEL.alipay_pc ||
    channel === pay_model.CHANNEL.alipay_wap) {
    result = yield alipay_client.closeTrade({ pay_id, transaction_no, pid });
  } else if (channel === pay_model.CHANNEL.weixin_bar) {
    result = yield alipay_client.cancelTrade({ pay_id, transaction_no, pid });
  } else if (channel === pay_model.CHANNEL.weixin_js ||
    channel === pay_model.CHANNEL.weixin_app ||
    channel === pay_model.CHANNEL.weixin_wap ||
    channel === pay_model.CHANNEL.weixin_qr ||
    channel === pay_model.CHANNEL.weixin_lite) {
    result = yield weixin_client.closeTrade({ pay_id, transaction_no, pid });
  }
  if (result.status === 'close') {
    yield pay.close(transaction_no, info);
  } else if (result.status === 'cancel') {
    yield pay.cancel(transaction_no, info);
  } else if (info.status === 'success') {
    yield pay.payed(transaction_no, info);
  } else if (info.status === 'finish') {
    yield pay.payed(transaction_no, info, true);
  } else {
    return false;
  }
  return true;
}

/**
 * 处理支付状态: 如果错误，则直接撤销该订单
 * @param pay
 * @param help
 * @param info
 */
function* analyze(pay, help, info, instance) {
  if (pay.isPayed()) {
    if (info.status === 'error' || info.status === 'close' || info.status === 'cancel') {
      throw SystemException('支付异常：已支付，第三方未支付');
    }
    return;
  } else if (pay.isInvalid()) {
    if (info.status === 'success' || info.status === 'finish') {
      throw SystemException('支付异常：已撤销或者关闭，第三方支付成功');
    }
    return;
  }

  if (info.status === 'success') {
    // 支付成功
    yield pay.payed(info.transaction_no, info);
  } else if (info.status === 'finish') {
    // 完成，无法撤销或者关闭
    yield pay.payed(info.transaction_no, info, true);
  } else if (info.status === 'error') {
    // 支付错误，需要关闭支付交易
    const result = yield end(pay, info);
    if (!result) yield pay.error(info.transaction_no, info);
  } else if (info.status === 'cancel') {
    // 对方已撤销
    yield pay.cancel(info.transaction_no, info);
  } else if (info.status === 'close') {
    // 对方已经关闭
    yield pay.close(info.transaction_no, info);
  } else if (info.status === 'system') {
    // system 开发接口错误
    yield pay.system(info);
  } else if (info.status === 'exception') {
    // exception 支付流程异常
    yield pay.exception(info);
  }
  if (pay.isPayed()) {
    // 已支付，成功
    yield instance.payed();
  }
}

/**
 * 获取第三方账号
 * @param instance
 * @param channel
 * @returns {*}
 */
function* getPid(instance, channel) {
  const source = CHANNEL_MAP[channel];
  if (source === SOURCE.LOCAL) {
    // 无需第三方
    return '';
  }
  // 快速付款
  // const account_id = 0;
  return config[source].pid;
}

/**
 * 返回统一的通知地址
 * @param channel
 * @returns {*}
 */
function getNotifyUrl(channel) {
  return config.pay_notify + channel;
}

trade.getSource = function* ({ channel }) {
  return SOURCE_MAP[CHANNEL_MAP[channel]];
};

trade.client = function* ({ instance, pay, info }) {
  const source = CHANNEL_MAP[pay.channel];

  if (source !== SOURCE.LOCAL) {
    const help = getHandle(pay.channel);

    if (!help.validTrade({ info, pay_info: pay.getInfo() })) throw ValidException('支付信息验证错误');
    if (pay.money !== info.money) throw ValidException('支付金额错误');
    yield analyze(pay, help, info, instance);
    if (info.status === 'system') throw SystemException(info);
  }

  // 统一支付返回，支付成功才有具体内容，其余都需要查询接口继续操作
  // status:wait直接重新查询，其余都重新发起交易：close，cancel，exception, system
  if (pay.isPayed()) {
    return {
      open_id: info.open_id,
      source,
      channel: pay.channel,
      money: pay.money,
      time: pay.pay_time,
    };
  } else if (pay.isPaying()) {
    // 支付中，需继续查询
    return {
      status: info.status,
      message: info.message,
    };
  } else {
    // 失败或取消，需重新发起支付
    return {
      status: info.status,
      message: info.message,
    };
  }
};

module.exports.CHANNEL_MAP = CHANNEL_MAP;
/**
 * 返回支付渠道的第三方来源
 * @type {trade.getSource}
 */
module.exports.getSource = trade.getSource;

/**
 * 解析支付渠道的异步返回结果
 * @param source
 * @param channel
 * @param content
 */
module.exports.notify = function* ({ source = null, channel = null, content }) {
  if (!source && !channel) throw EmptyException('第三方支付错误');
  if (!source) {
    source = CHANNEL_MAP[channel];
    if (!CHANNEL_MAP[channel]) throw ValidException('第三方支付错误');
  }
  const help = getHandle(source);

  return yield help.notifyTrade(content);
};

/**
 * 解析支付渠道的同步返回结果
 * @param source
 * @param channel
 * @param content
 */
module.exports.return = function* ({ source = null, channel = null, content }) {
  if (!source && !channel) throw EmptyException('第三方支付错误');
  if (!source) {
    source = CHANNEL_MAP[channel];
    if (!source) throw ValidException('第三方支付错误');
  }
  const help = getHandle(source);

  return yield help.returnTrade(content);
};

/**
 * 查询支付
 * @param pay
 */
module.exports.query = function* ({ pay }) {
  const help = getHandle(pay.channel);
  return yield help.getTrade({ pay_id: pay.id, transaction_no: pay.transaction_no, pid: pay.pid });
};

/**
 * 异步结果，返回给渠道
 * @param instance
 * @param pay
 * @param info
 */
module.exports.server = function* ({ instance, pay, info }) {
  const help = getHandle(pay.channel);

  if (!help.validTrade({ info, pay_info: pay.getInfo() })) throw ValidException('支付信息验证错误');
  if (pay.money !== info.money) throw ValidException('支付金额错误');
  yield analyze(pay, help, info, instance);
  return {
    status: info.status,
    message: info.message,
  };
};

/**
 * 返回客户端结果
 * @param instance
 * @param pay
 * @param info
 */
module.exports.client = trade.client;

/**
 * 创建支付交易
 * @param money
 * @param channel
 * @param module
 * @param module_id
 * @param pid
 * @param subject
 * @param body
 * @param kwargs
 */
module.exports.pay = function* ({ money, channel, module, module_id, pid, subject, body, kwargs }) {
  const pay = yield pay_model.make(
    money,
    channel, module, module_id, pid, subject, body, kwargs.client_ip,
  );
  return pay;
};
/**
 * 预处理验证
 * @param instance
 * @param kwargs
 * @return pid
 */
module.exports.preprocess = function* ({ instance, kwargs }) {
  if (!kwargs.channel) throw EmptyException('支付渠道为空');
  const { channel } = kwargs;
  if (instance.pay_id || instance.pay_id !== '') {
    const old_pay = yield pay_model.get(instance.pay_id);
    // 对于已有的支付进行处理
    if (old_pay) {
      if (old_pay.isPaying()) {
        // 对于还在处理中的结束订单
        const result = yield end(old_pay, old_pay.getResult());
        if (!result) {
          throw ValidException('关闭订单失败，请重新操作');
        }
      }
      if (old_pay.isPayed()) {
        // 已支付，成功
        yield instance.payed();
        throw ValidException('已支付成功');
      }
    }
  }

  if (channel === pay_model.CHANNEL.alipay_bar || channel === pay_model.CHANNEL.weixin_bar) {
    if (!kwargs.auth_code) throw ValidException('需要授权码');
  }
  if (channel === pay_model.CHANNEL.alipay_wap) {
    if (!kwargs.return_url) throw ValidException('需要返回信息');
  }
  if (channel === pay_model.CHANNEL.weixin_wap || channel === pay_model.CHANNEL.weixin_lite) {
    if (!kwargs.open_id) throw ValidException('需要open_id');
  }
  if (channel === pay_model.CHANNEL.weixin_js ||
    channel === pay_model.CHANNEL.weixin_qr ||
    channel === pay_model.CHANNEL.weixin_wap ||
    channel === pay_model.CHANNEL.weixin_app ||
    channel === pay_model.CHANNEL.weixin_lite ||
    channel === pay_model.CHANNEL.weixin_bar) {
    if (!kwargs.client_ip) throw ValidException('需要客户端ip');
  }
  if (!kwargs.client_ip) throw ValidException('需要客户端ip');
  return yield getPid(instance, channel);
};

/**
 * 处理支付：创建后的操作
 * 支付扫描返回统一状态
 * 正常支付返回支付状态
 * @param pay
 * @param instance
 * @param kwargs
 * @returns {*|{id}|{id: *, module: *, module_id: *}}
 */
module.exports.process = function* ({ instance, pay, kwargs }) {
  yield instance.pay(pay);
  const { subject, id, body, money, pid, channel } = pay;
  const notify_url = getNotifyUrl(pay.channel);
  const pay_id = id;
  const source = CHANNEL_MAP[channel];

  if (source === SOURCE.LOCAL) {
    // 快速付款
    yield pay.fast();
    return yield trade.client({ instance, pay, info: {} });
  } else if (channel === pay_model.CHANNEL.alipay_bar) {
    // 条码支付
    const info = yield alipay_client.payTrade({
      pay_id,
      auth_code: kwargs.auth_code,
      pid,
      money,
      subject,
      body,
      notify_url,
    });
    yield pay.setInfo(info);
    // 循环查询直到得到结果
    return yield trade.client({ instance, pay, info });
  } else if (channel === pay_model.CHANNEL.weixin_bar) {
    // 条码支付
    const info = yield weixin_client.payTrade({
      pay_id,
      auth_code: kwargs.auth_code,
      pid,
      money,
      subject,
      body,
      ip: kwargs.client_ip,
    });
    yield pay.setInfo(info);
    // 循环查询直到得到结果
    return yield trade.client({ instance, pay, info });
  } else {
    let info;
    if (channel === pay_model.CHANNEL.weixin_app) {
      info = yield weixin_client.appTrade({
        pay_id,
        pid,
        money,
        subject,
        body,
        notify_url,
        ip: kwargs.client_ip,
      });
    } else if (channel === pay_model.CHANNEL.weixin_js) {
      info = yield weixin_client.wapTrade({
        pay_id,
        pid,
        money,
        subject,
        body,
        notify_url,
        ip: kwargs.client_ip,
        open_id: kwargs.open_id,
      });
    } else if (channel === pay_model.CHANNEL.weixin_qr) {
      info = yield weixin_client.preTrade({
        pay_id,
        pid,
        money,
        subject,
        body,
        notify_url,
        ip: kwargs.client_ip,
      });
    } else if (channel === pay_model.CHANNEL.weixin_lite) {
      info = yield weixin_client.liteTrade({
        pay_id,
        pid,
        money,
        subject,
        body,
        notify_url,
        ip: kwargs.client_ip,
        open_id: kwargs.open_id,
      });
    } else if (channel === pay_model.CHANNEL.alipay_wap) {
      info = yield alipay_client.wapTrade({
        pay_id,
        pid,
        money,
        subject,
        body,
        return_url: kwargs.return_url,
        notify_url,
      });
    } else if (channel === pay_model.CHANNEL.alipay_app) {
      info = yield alipay_client.appTrade({
        pay_id,
        pid,
        money,
        subject,
        body,
        notify_url,
      });
    } else if (channel === pay_model.CHANNEL.alipay_qr) {
      info = yield alipay_client.preTrade({
        pay_id,
        pid,
        money,
        subject,
        body,
        notify_url,
      });
    }
    if (info.status === 'ok') {
      // 返回的结果的response用于和第三方交互
      yield pay.setInfo(info);
      return info;
    } else {
      // 直接结束支付，重新请求开启新的支付
      yield pay.system(info);
      throw SystemException(info);
    }
  }
};
