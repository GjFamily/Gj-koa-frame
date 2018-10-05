/* eslint-disable */
const GENDER = require('../').GENDER;
const debug = require('debug')('app:qq:open')
module.exports.getOAuthUrl = function (url) {
  return `https://graph.qq.com/oauth2.0/show?which=Login&display=pc&response_type=code&client_id=${this.app_id}&redirect_uri=${encodeURIComponent(url)}&state=web&scope=get_user_info`;
};

/**
 * 获取用户信息
 * @param code
 * @returns {{open_id: *, access_token: *, expires_time: *, refresh_token: *, nick_name: *}}
 */
module.exports.webAuthorize = function* ({ code, url }) {
  let { access_token, expires_in, refresh_token } = yield getWebAccessToken(this, code, url);
  if (!access_token) throw new Error('access_token');
  let { openid } = yield getOpenId(this, access_token);
  if (!openid) throw new Error('openid');
  let { nickname, gender, figureurl_qq_2 } = yield getWebUserInfo(this, access_token, openid);
  return {
    open_id: openid,
    access_token: access_token,
    expires_time: expires_in,
    refresh_token: refresh_token,
    nick_name: nickname,
    gender: gender == '男' ? GENDER.MEN : GENDER.WOMEN,
    // province: province,
    // city: city,
    // country: country,
    avatar: figureurl_qq_2
  }
};

/**
 *
 * @param access_token
 * @param open_id
 */
function* getWebUserInfo(client, access_token, open_id) {
  let data = {
    access_token: access_token,
    openid: open_id,
    oauth_consumer_key: client.app_id,
  };
  return yield client.get('/user/get_user_info', data);
}

/**
 *
 * @param code
 */
function* getWebAccessToken(client, code, url) {
  let data = {
    grant_type: 'authorization_code',
    client_id: client.app_id,
    client_secret: client.app_secret,
    code: code,
    redirect_uri: url
  };
  let { body } = yield client.request('/oauth2.0/token', data);
  debug(body);
  let d = {};
  body.split('&').forEach(item => {
    let it = item.split('=');
    d[it[0]] = it[1];
  })
  return d
}

/**
 *
 * @param code
 */
function* getOpenId(client, access_token) {
  let data = {
    access_token
  };
  let { body } = yield client.request('/oauth2.0/me', data);
  debug(body);
  return JSON.parse(body.substr(10).slice(0, -3))
}