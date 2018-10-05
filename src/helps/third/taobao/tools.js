module.exports.getOAuthUrl = function (url) {
  return `https://oauth.taobao.com/authorize?response_type=code&client_id=${this.app_key}&redirect_uri=${encodeURIComponent(url)}&view=web`;
};

/**
 * 获取用户信息
 * @param code
 * @returns {{open_id: *, access_token: *, expires_time: *, refresh_token: *, nick_name: *}}
 */
module.exports.webAuthorize = function* ({ code }) {
  let { top_auth_token_create_response: { token_result } } = yield this.exec('taobao.top.auth.token.create', { code });
  let { access_token, expires_in, refresh_token, taobao_user_nick, taobao_user_id } = JSON.parse(token_result);
  return {
    open_id: taobao_user_id,
    access_token,
    expires_time: expires_in,
    refresh_token,
    nick_name: taobao_user_nick,
  };
};
