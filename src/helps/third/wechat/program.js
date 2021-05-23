/* eslint-disable */

const fs = require('fs');

/**
 * 获取用户登录凭证：小程序内部
 * @param code
 * @returns {{open_id: *, session_key: *, unionid: *}}
 */
module.exports.miniCode = function* ({ code }) {
  let { session_key, openid, expires_in } = yield getSeesionKey(this, code);
  return {
    open_id: openid,
    session_key: session_key,
    expires_in: expires_in
  }
};

module.exports.getMediaId = function* ({ file }) {
  let result = yield this.cache.get('wechat://media_id/' + this.app_id + '/' + file);
  if (result) return result;
  const form = {
    file: fs.createReadStream(file)
  };
  const { access_token } = yield getAccessToken(this);
  return yield this.form('/cgi-bin/media/upload?access_token=' + access_token + '&type=image', form).then(({ media_id }) => {
    return this.cache.set('wechat://media_id/' + this.app_id + '/' + file, media_id, 86400).then(() => {
      return media_id
    })
  })
}

module.exports.sendTextMessage = function* ({ text, open_id }) {
  const message = {
    "touser": open_id,
    "msgtype": "text",
    "text":
    {
      "content": text
    }
  };
  const { access_token } = yield getAccessToken(this);
  return yield this.post('/cgi-bin/message/custom/send?access_token=' + access_token, message)
}

module.exports.sendImageMessage = function* ({ mediaId, open_id }) {
  const message = {
    "touser": open_id,
    "msgtype": "image",
    "image":
    {
      "media_id": mediaId
    }
  };
  const { access_token } = yield getAccessToken(this);
  return yield this.post('/cgi-bin/message/custom/send?access_token=' + access_token, message)
}

function* getSeesionKey(client, code) {
  let data = {
    grant_type: 'authorization_code',
    appid: client.app_id,
    secret: client.app_secret,
    js_code: code
  };
  return yield client.request('/sns/jscode2session', data)
}

/**
 * 发送模板消息
 * @param open_id
 * @param template_id
 * @param page
 * @param form_id
 * @param data
 * @returns {{}}
 */
module.exports.miniSendMessage = function* ({ open_id, template_id, page, form_id, data }) {
  let info = {
    "touser": open_id,
    "template_id": template_id,
    "page": page,
    "form_id": form_id,
    "data": data
    // "keyword1": {
    //   "value": "339208499",
    //   "color": "#173177"
    // },
  }
  let { access_token } = yield getAccessToken(this);
  return yield this.post('/cgi-bin/message/wxopen/template/send?access_token=' + access_token, info).then((result) => {
    console.log(result)
  })
};

module.exports.miniMessageList = function* () {
  let info = {
    "offset": 0,
    "count": 20
  }
  let { access_token } = yield getAccessToken(this);
  return yield this.post('/cgi-bin/wxopen/template/list?access_token=' + access_token, info).then((result) => {
    console.log(result)
  })
}

/**
 *
 * @returns {"access_token":"ACCESS_TOKEN","expires_in":7200}
 */
function* getAccessToken(client, f) {
  if (!f) {
    let result = yield client.cache.get('wechat://access_token/' + client.app_id)
    if (result) return {
      access_token: result
    };
  }
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
