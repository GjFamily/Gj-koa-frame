
import Geetest from 'gt3-sdk';
import { ValidException } from '../exception';

export default function Gee(geetest, exception) {
  const captcha = new Geetest(geetest);
  return {
    * register(param) {
      const ctx = this;
      let handle = new Promise((resolve, reject) => {
        captcha.register({
          client_type: param.client_type,
          ip_address: param.ip_address,
        }, (err, data) => {
          if (err) {
            reject(err);
          } else if (!data.success) {
            ctx.cache.geetest_fallback = true;
            resolve(data);
          } else {
            // 进入 failback，如果一直进入此模式，请检查服务器到极验服务器是否可访问
            // 可以通过修改 hosts 把极验服务器 api.geetest.com 指到不可访问的地址

            // 为以防万一，你可以选择以下两种方式之一：

            // 1. 继续使用极验提供的failback备用方案
            ctx.cache.geetest_fallback = false;
            resolve(data);
          }
        });
      });
      return yield handle;
    },
    * validate(param) {
      const ctx = this;
      let handle = new Promise((resolve, reject) => {
        if (!param.geetest) return reject(exception || ValidException('验证失败'));
        return captcha.validate(ctx.cache.geetest_fallback, param.geetest, (err, success) => {
          if (err) {
            reject(err);
          } else if (!success) {
            reject(exception || ValidException('验证失败'));
          } else {
            resolve();
          }
        });
      });
      yield handle;
      return param;
    },
  };
}
