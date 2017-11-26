const GENDER = require('./').GENDER;
/**
 * 获取用户信息：在微信内部
 * @param code
 * @returns {{open_id: *, access_token: *, expires_time: *, refresh_token: *, nick_name: *, gender: *, province: *, city: *, country: *, avatar: *}}
 */
module.exports.webAuthorize = function* ({ code }) {
  let { access_token, openid, expires_in, refresh_token } = yield getWebAccessToken(this, code);
  let { nickname, sex, province, city, country, headimgurl } = yield getWebUserInfo(this, access_token, openid);
  return {
    open_id: openid,
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
    secret: client.app_key,
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
