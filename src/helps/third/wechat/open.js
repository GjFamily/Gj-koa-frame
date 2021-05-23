/* eslint-disable */
const GENDER = require('../').GENDER;
const tools = require('../../tools');

module.exports.getOAuthUrl = function (url) {
  return `https://open.weixin.qq.com/connect/qrconnect?appid=${this.app_id}&redirect_uri=${encodeURIComponent(url)}&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect`;
}

module.exports.publicQrCode = function* ({ user_id }) {
  const { access_token } = yield getAccessToken(this);
  const result = yield getPublicQrCode(this, access_token, user_id);
  return result;
}

module.exports.parseMessage = function* (content) {
  return yield tools.parseXML(content);
}

module.exports.replayTextMessage = function (content, text) {
  if (!text) return 'success';
  const result = {};
  result.ToUserName = content.FromUserName;
  result.FromUserName = content.ToUserName;
  result.MsgType = 'text';
  result.CreateTime = parseInt(new Date().valueOf() / 1000);
  result.Content = text;
  return tools.toXML(result, true);
}

module.exports.replayImageMessage = function (content, mediaId) {
  if (!mediaId) return 'success';
  const result = {};
  result.ToUserName = content.FromUserName;
  result.FromUserName = content.ToUserName;
  result.MsgType = 'image';
  result.CreateTime = parseInt(new Date().valueOf() / 1000);
  result.Image = {};
  result.Image.MediaId = mediaId;
  return tools.toXML(result, true);
}

module.exports.getUserInfo = function* (open_id) {
  const { access_token } = yield getAccessToken(this);
  const result = yield getUserInfo(this, access_token, open_id);
  return result;
}

module.exports.queryMenu = function* () {
  const { access_token } = yield getAccessToken(this);
  return yield queryMenu(this, access_token);
}

module.exports.createMenu = function* (data) {
  const { access_token } = yield getAccessToken(this);
  return yield createMenu(this, access_token, data);
}

/**
 * 获取用户信息：在微信内部
 * @param code
 * @returns {{open_id: *, access_token: *, expires_time: *, refresh_token: *, nick_name: *, gender: *, province: *, city: *, country: *, avatar: *}}
 */
module.exports.webAuthorize = function* ({ code }) {
  let { access_token, openid, expires_in, refresh_token } = yield getWebAccessToken(this, code);
  if (!access_token) throw new Error('access_token');
  let { nickname, unionid, sex, province, city, country, headimgurl } = yield getWebUserInfo(this, access_token, openid);
  return {
    open_id: openid,
    union_id: unionid,
    access_token: access_token,
    expires_time: expires_in,
    refresh_token: refresh_token,
    nick_name: nickname,
    gender: sex == 1 ? GENDER.MEN : GENDER.WOMEN,
    province: province,
    city: city,
    country: country,
    avatar: headimgurl
  }
};
/**
 *
 * @param access_token
 * @param open_id
 * @returns
  {    "openid":" OPENID",
  " nickname": NICKNAME,
  "sex":"1",
  "province":"PROVINCE"
  "city":"CITY",
  "country":"COUNTRY",
  "headimgurl":    "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ
  4eMsv84eavHiaiceqxibJxCfHe/46",
  "privilege":[ "PRIVILEGE1" "PRIVILEGE2"     ],
  "unionid": "o6_bmasdasdsad6_2sgVt7hMZOPfL"
  }
 */
function* getWebUserInfo(client, access_token, open_id) {
  let data = {
    access_token: access_token,
    openid: open_id,
    lang: 'zh_CN'
  };
  return yield client.request('/sns/userinfo', data);
}

/**
 *
 * @param code
 * @returns { "access_token":"ACCESS_TOKEN",
   "expires_in":7200,
   "refresh_token":"REFRESH_TOKEN",
   "openid":"OPENID",
   "scope":"SCOPE" }
 */
function* getWebAccessToken(client, code) {
  let data = {
    grant_type: 'authorization_code',
    appid: client.app_id,
    secret: client.app_secret,
    code: code
  };
  return yield client.request('/sns/oauth2/access_token', data);
}

/**
 * @param refresh_token
 * @returns { "access_token":"ACCESS_TOKEN",
   "expires_in":7200,
   "refresh_token":"REFRESH_TOKEN",
   "openid":"OPENID",
   "scope":"SCOPE" }
 */
function* refreshWebAccessToken(client, refresh_token) {
  let data = {
    grant_type: 'authorization_code',
    appid: client.app_id,
    refresh_token: refresh_token
  };
  return yield client.request('/sns/oauth2/refresh_token', data);
}

function* createMenu(client, access_token, data) {
  return yield client.post(`/cgi-bin/menu/create?access_token=${access_token}`, data);
}

function* queryMenu(client, access_token) {
  let data = {
    access_token: access_token
  };
  return yield client.request('/cgi-bin/menu/get', data);
}

function* getUserInfo(client, access_token, open_id) {
  let data = {
    access_token: access_token,
    openid: open_id,
    lang: 'zh_CN'
  };
  return yield client.request('/cgi-bin/user/info', data);
}

/**
 * 获取临时二维码 携带用户id
 * return {"ticket":"gQH47joAAAAAAAAAASxodHRwOi8vd2VpeGluLnFxLmNvbS9xL2taZ2Z3TVRtNzJXV1Brb3ZhYmJJAAIEZ23sUwMEmm
3sUw==","expire_seconds":60,"url":"http://weixin.qq.com/q/kZgfwMTm72WWPkovabbI"}
 */
function* getPublicQrCode(client, access_token, user_id) {
  let data = {
    expire_seconds: 300,
    action_name: "QR_SCENE",
    action_info: { scene: { scene_id: user_id } }
  };
  return yield client.post(`/cgi-bin/qrcode/create?access_token=${access_token}`, data);
}

/**
 * 获取公众号access token
 * @param {*} client 
 */
function* getAccessToken(client) {
  let result = yield client.cache.get('wechat://access_token/' + client.app_id);
  if (result) return {
    access_token: result
  };
  let data = {
    grant_type: 'client_credential',
    appid: client.app_id,
    secret: client.app_secret
  };
  return yield client.request('/cgi-bin/token', data).then(({ access_token, expires_in }) => {
    return client.cache.set('wechat://access_token/' + client.app_id, access_token, expires_in - 100).then(() => {
      return {
        access_token
      }
    })
  });
}
