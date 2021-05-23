import config from '../../config';
// import wechat_client from './../api/wechat';
import { server_client as wechat_server_client, public_client as wechat_public_client } from './../api/wechat';
import qq_client from './../api/qq';
import taobao_client from './../api/taobao';
import userModel from './../../models/user';
import { ValidException } from '../../helps/exception';

// 子渠道使用下划线分割，可以绑定union_id
const CHANNEL_MAP = {
  wechat_pc: wechat_server_client,
  wechat_h5: wechat_public_client,
  taobao: taobao_client,
  qq: qq_client,
};

function getClient(channel) {
  if (!CHANNEL_MAP[channel]) throw ValidException('第三方验证错误');
  return CHANNEL_MAP[channel];
}
function getWhere(channel, { open_id, union_id }) {
  let where = [[`${channel}_open_id`, '=', open_id]];
  if (union_id) where = [[`${channel.split('_')[0]}_union_id`, '=', union_id]];
  return where;
}
function getCallbackUrl(channel) {
  return `${config.oauth_callback_url}${channel}`;
}

function generateData(channel, { nick_name, avatar, open_id, union_id }) {
  let data = {
    [`${channel}_open_id`]: open_id,
    nickname: nick_name,
    avatar,
  };
  if (union_id) data[`${channel.split('_')[0]}_union_id`] = union_id;
  return data;
}

export function* redirect({ channel, url, protocol }) {
  let client = getClient(channel);
  let u = url || getCallbackUrl(channel);
  u = u.replace('http', 'https').replace('https', protocol);
  url = client.getOAuthUrl(u);
  this.response.redirect(url);
}

export function* callback({ channel, url, code, parent_id }) {
  let client = getClient(channel);
  let result = null;
  url = url || getCallbackUrl(channel);
  try {
    result = yield client.webAuthorize({ code, url });
  } catch (err) {
    // 接口错误，重新请求
    this.response.redirect(url);
    return {};
  }
  let where = getWhere(channel, result);
  let user = yield userModel.one({
    where,
  });
  let data = generateData(channel, result);
  if (!user) {
    data.parent_id = parent_id;
    user = yield userModel.add(data);
  } else {
    yield userModel.put(user.id, data);
    user = yield userModel.get(user.id);
  }
  return user.info();
}

export function* callbackWrap({ channel, code, url, cb }) {
  let client = getClient(channel);

  let result = null;
  url = url || getCallbackUrl(channel);
  try {
    result = yield client.webAuthorize({ code, url });
  } catch (err) {
    // 接口错误，重新请求
    this.response.redirect(url);
    return {};
  }
  return yield cb(result);
}

export function* login({ channel, code }) {
  let client = getClient(channel);
  let result = null;
  result = yield client.webAuthorize({ code });
  let where = getWhere(channel, result);
  let user = yield userModel.one({
    where,
  });
  let data = generateData(channel, result);
  if (!user) {
    user = yield userModel.add(data);
  } else {
    yield userModel.put(user.id, data);
    user = yield userModel.get(user.id);
  }
  return user.info();
}
