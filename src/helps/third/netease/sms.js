import ApiHelp from '../../api';
import config from '../../../config';
import { SystemException, ValidException } from '../../exception';

// ACCESS_KEY_ID/ACCESS_KEY_SECRET 根据实际申请的账号信息进行替换
const AppKey = config.netease.app_key;
const AppSecret = config.netease.app_secret;
// const SignName = config.netease.sms_sign;
// 初始化sms_client
let sms_mapping = {};
for (let key in config.netease.sms_template) {
  sms_mapping[key] = key;
}
export const TEMPLATES = sms_mapping;
function sign(time, nonce) {
  let str = `${AppSecret}${nonce}${time}`;
  return str.hash_sha1();
}
function header() {
  let time = Date.nowTime();
  let nonce = String.randomString(16);
  return {
    AppKey,
    CurTime: time,
    Nonce: nonce,
    CheckSum: sign(time, nonce),
    charset: 'utf-8',
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
  };
}
export function send(mobile, template, params) {
  let item = config.netease.sms_template[template];
  if (!item) return Promise.reject(new Error('sms template is error'));

  let params_list = [];
  for (let key in item.params) {
    if (!params[key]) return Promise.reject(new Error(`sms params miss: ${key}`));
    params_list.push(params[key]);
  }
  console.log(`sms: ${mobile} ${template} -> ${item.template} ${JSON.stringify(params)} (${JSON.stringify(params_list)})`);
  let data = {
    templateid: item.template,
    // mobiles: JSON.stringify([mobile]),
    mobile,
    authCode: params_list[0],
    // params: JSON.stringify(params_list),
  };
  let dataString = '';
  for (let index in data) {
    dataString += `${index}=${data[index]}&`;
  }
  return ApiHelp.post('https://api.netease.im/sms/sendcode.action', dataString.substring(0, dataString.length - 1), header()).then(({ body }) => {
    console.log(body);
    let { code, msg, obj } = JSON.parse(body);
    switch (code) {
      case 200:
        return { obj };
      case 315:
        throw SystemException('IP限制', body);
      case 403:
        throw SystemException('非法操作或没有权限', body);
      case 413:
        throw SystemException('验证失败(短信服务)', body);
      case 414:
        if (msg.indexOf('mobile') === 0) {
          throw ValidException('手机格式错误');
        }
        throw SystemException('参数错误', body);
      case 500:
      default:
        throw SystemException('服务器内部错误', body);
    }
  });
}
