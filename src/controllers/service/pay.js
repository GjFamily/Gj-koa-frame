import * as tradeController from '../process/trade';
import * as payModel from './../../models/pay';
import { ValidException, EmptyException, SystemException } from '../../helps/exception';


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
export function* notify({ channel, content }) {
  const info = yield tradeController.notify({ channel, content });
  if (!info.id) throw ValidException('支付签名错误');
  const pay = yield payModel.get(info.id);
  if (!pay) throw ValidException('支付信息不存在');
  const instance = yield getInstance(pay);
  const result = yield tradeController.server({ instance, pay, info });
  this.body = result.message;
}

/**
 * 同步回调处理
 * @param channel
 * @param content
 */
export function* ret({ channel, content }) {
  const info = yield tradeController.return({ channel, content });
  if (!info.id) throw ValidException('支付签名错误');
  const pay = yield payModel.get(info.id);
  if (!pay) throw ValidException('支付信息不存在');
  const instance = yield getInstance(pay);
  return yield tradeController.client({ instance, pay, info });
}

/**
 * 支付状态查询
 * @param id
 */
export function* sync({ id }) {
  if (!id) throw EmptyException('支付信息为空');
  const pay = yield payModel.get(id);
  if (!pay) throw ValidException('支付信息不存在');
  const instance = yield getInstance(pay);
  const info = yield tradeController.query({ pay });
  if (!info.id) throw ValidException('支付不存在');
  return yield tradeController.client({ instance, pay, info });
}
