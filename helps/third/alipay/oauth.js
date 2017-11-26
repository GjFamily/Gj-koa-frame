const GENDER = require('./').GENDER;
/**
 * 获取用户信息：在支付宝内部
 * @param code
 * @returns {{open_id: *, access_token: *, expires_time: *, refresh_token: *, nick_name: *, gender: *, province: *, city: *, country: *, avatar: *}}
 */
module.exports.webAuthorize = function *({ code }) {
  let { access_token, user_id, expires_in, refresh_token } = yield getWebAccessToken(this, code);
  let { nick_name, gender, province, city, country, avatar } = yield getWebUserInfo(this, access_token);
  return {
    open_id: user_id,
    access_token: access_token,
    expires_time: expires_in,
    refresh_token: refresh_token,
    nick_name: nick_name,
    gender: gender == 1? GENDER.MEN: GENDER.WOMEN,
    province: province,
    city: city,
    country: country,
    avatar: avatar
  }
};
/**
 *
 * @param code
 * @returns
  {
  "alipay_system_oauth_token_response": {
  "access_token": "publicpBa869cad0990e4e17a57ecf7c5469a4b2",
  "user_id": "2088411964574197",
  "alipay_user_id": "20881007434917916336963360919773",
  "expires_in": 300,
  "re_expires_in": 300,
  "refresh_token": "publicpB0ff17e364f0743c79b0b0d7f55e20bfc"
  },
  "sign": "xDffQVBBelDiY/FdJi4/a2iQV1I7TgKDFf/9BUCe6+l1UB55YDOdlCAir8CGlTfa0zLYdX0UaYAa43zY2jLhCTDG+d6EjhCBWsNY74yTdiM95kTNsREgAt4PkOkpsbyZVXdLIShxLFAqI49GIv82J3YtzBcVDDdDeqFcUhfasII="
  }
 */
function * getWebAccessToken (client, code) {
  let data = client.getBaseData();
  data.method = 'alipay.system.oauth.token';
  data.grant_type = 'authorization_code';
  data.code = code;
  let { alipay_system_oauth_token_response } = yield client.request(data);
  return alipay_system_oauth_token_response;
}

/**
 *
 * @param refresh_token
 * @returns
  {
  "alipay_system_oauth_token_response": {
  "access_token": "publicpBa869cad0990e4e17a57ecf7c5469a4b2",
  "user_id": "2088411964574197",
  "alipay_user_id": "20881007434917916336963360919773",
  "expires_in": 300,
  "re_expires_in": 300,
  "refresh_token": "publicpB0ff17e364f0743c79b0b0d7f55e20bfc"
  },
  "sign": "xDffQVBBelDiY/FdJi4/a2iQV1I7TgKDFf/9BUCe6+l1UB55YDOdlCAir8CGlTfa0zLYdX0UaYAa43zY2jLhCTDG+d6EjhCBWsNY74yTdiM95kTNsREgAt4PkOkpsbyZVXdLIShxLFAqI49GIv82J3YtzBcVDDdDeqFcUhfasII="
  }
 */
function * refreshWebAccessToken (client, refresh_token) {
  let data = client.getBaseData()
  data.method = 'alipay.system.oauth.token';
  data.grant_type = 'authorization_code';
  data.refresh_token = refresh_token;
  let { alipay_system_oauth_token_response } = yield client.request(data);
  return alipay_system_oauth_token_response;
}

/**
 *
 * @param access_token
 * @returns
  {
  "alipay_user_info_share_response": {
  "avatar": "https:\/\/tfsimg.alipay.com\/images\/partner\/T1k0xiXXRnXXXXXXXX",
  "nick_name": "张三",
  "city": "杭州",
  "province": "浙江省",
  "gender" : "M",
  "user_type_value": "2",
  "is_licence_auth": "F",
  "is_certified": "T",
  "is_certify_grade_a": "T",
  "is_student_certified": "F",
  "is_bank_auth": "T",
  "is_mobile_auth": "T",
  "alipay_user_id": "2088102015433735",
  "user_id": "20881007434917916336963360919773",
  "user_status": "T",
  "is_id_auth": "T"
  },
  "sign": "jhoSkfE7BTIbwEx0L8/H0GU0Z2DOZYIJlrUMyJL8wwwInVeXfz+CWqx0V2b3FvhMQSrb74dkzDQpGXGdZQZMldGe4+FSEQU1V3tWijpO9ZisNJnEpF+U2lQ7IUMLsgjjx9a0IdMwvXlqz1HPrmFZQjG2dvlFyXhi07HcEnVOJZw="
  }
 */
function * getWebUserInfo (client, access_token) {
  let data = client.getBaseData()
  data.method = 'alipay.user.info.share';
  data.grant_type = 'authorization_code';
  data.auth_token = access_token;
  let { alipay_user_info_share_response } = yield client.request(data);
  return alipay_user_info_share_response;
}

// 此app为支付宝上架app，服务授权接口
module.exports.appAuthorize = function *({ code }) {
  let { app_auth_token, user_id, expires_in, app_refresh_token, auth_app_id, re_expires_in } = yield getAppAccessToken(this, code);
  let { auth_end, auth_start, auth_methods } = yield getAppAuthInfo(this, app_auth_token);
  return {
    pid: user_id,
    app_auth_token: app_auth_token,
    expires_time: expires_in,
    refresh_token: refresh_token,
    auth_app_id: auth_app_id,
    auth_methods: auth_methods
  }
};
/**
 *
 * @param code
 * @returns
  {
    "alipay_open_auth_token_app_response": {
        "code": "10000",
        "msg": "Success",
        "app_auth_token": "201510BBb507dc9f5efe41a0b98ae22f01519X62",
        "app_refresh_token": "201510BB0c409dd5758b4d939d4008a525463X62",
        "auth_app_id": "2013111800001989",
        "expires_in": 31536000,
        "re_expires_in": 32140800,
        "user_id": "2088011177545623"
    },
    "sign": "TR5xJkWX65vRjwnNNic5n228DFuXGFOCW4isWxx5iLN8EuHoU2OTOeh1SOzRredhnJ6G9eOXFMxHWl7066KQqtyxVq2PvW9jm94QOuvx3TZu7yFcEhiGvAuDSZXcZ0sw4TyQU9+/cvo0JKt4m1M91/Quq+QLOf+NSwJWaiJFZ9k="
}
 */
function * getAppAccessToken (client, code) {
  let data = client.getBaseData();
  data.method = 'alipay.open.auth.token.app';
  data.grant_type = 'authorization_code';
  data.code = code;
  let { alipay_open_auth_token_app_response } = yield client.request(data);
  return alipay_open_auth_token_app_response;
}

/**
 *
 * @param refresh_token
 * @returns
  {
    "alipay_open_auth_token_app_response": {
        "code": "10000",
        "msg": "Success",
        "app_auth_token": "201510BBb507dc9f5efe41a0b98ae22f01519X62",
        "app_refresh_token": "201510BB0c409dd5758b4d939d4008a525463X62",
        "auth_app_id": "2013111800001989",
        "expires_in": 31536000,
        "re_expires_in": 32140800,
        "user_id": "2088011177545623"
    },
    "sign": "TR5xJkWX65vRjwnNNic5n228DFuXGFOCW4isWxx5iLN8EuHoU2OTOeh1SOzRredhnJ6G9eOXFMxHWl7066KQqtyxVq2PvW9jm94QOuvx3TZu7yFcEhiGvAuDSZXcZ0sw4TyQU9+/cvo0JKt4m1M91/Quq+QLOf+NSwJWaiJFZ9k="
}
 */
function * refreshAppAccessToken (client, refresh_token) {
  let data = client.getBaseData()
  data.method = 'alipay.open.auth.token.app';
  data.grant_type = 'refresh_token';
  data.refresh_token = refresh_token;
  let { alipay_open_auth_token_app_response } = yield client.request(data);
  return alipay_open_auth_token_app_response;
}

/**
 *
 * @param access_token
 * @returns
  {
    "alipay_open_auth_token_app_query_response":{
        "auth_app_id":"2013121100055554",
        "auth_end":"2016-11-03 01:59:57",
        "auth_methods":[
            "\"alipay.open.auth.token.app.query\"",
            "\"alipay.system.oauth.token\"",
            "\"alipay.open.auth.token.app\""
        ],
        "auth_start":"2015-11-03 01:59:57",
        "code":"10000",
        "expires_in":31536000,
        "msg":"Success",
        "status":"valid",
        "user_id":"2088102150527498"
    }
}
 */
function * getAppAuthInfo (client, app_auth_token) {
  let data = client.getBaseData()
  data.method = 'alipay.open.auth.token.app.query';
  data.app_auth_token = app_auth_token;
  let { alipay_user_info_share_response } = yield client.request(data);
  return alipay_user_info_share_response;
}