const pay = require('./pay');
const oauth = require('./oauth');
const api = require('../../api');
// const user_model = require('../../../models/user');

const server_url = 'https://openapi.alipay.com/gateway.do';
const Client = function ({
  app_id,
  private_key,
  alipay_public_key,
  sign_type,
  encryptKey,
  encryptType,
}) {
  this.app_id = app_id;
  this.private_key = private_key;
  this.connectTimeout = 3000;
  this.readTimeout = 15000;
  this.sign_type = sign_type || 'RSA2';
  this.alipay_public_key = alipay_public_key;
  this.encryptKey = encryptKey || 'AES';
  this.encryptType = encryptType;
  this.partner_id = null;
};

Client.prototype.payInit = function ({ partner_id }) {
  this.partner_id = partner_id;
};
Client.prototype.getBaseData = function () {
  return {
    app_id: this.app_id,
    version: 1.0,
    charset: 'UTF-8',
    timestamp: new Date().format('yyyy-MM-dd hh:mm:ss'),
  };
};

Client.prototype.getSignContent = function (data) {
  if (data.sign) delete data.sign;
  let str = '';
  for (const i in data) {
    if (!data[i]) continue;
    let value = data[i];
    if (typeof (value) === 'object') {
      value = JSON.stringify(data[i]);
    } else if (typeof (data[i]) === 'number') {
      value = `${value}`;
    }
    str += `${(str ? '&' : '')}${i}=${value}`;
  }
  return str;
};
Client.prototype.getSignature = function (data) {
  const content = this.getSignContent(data);
  return content.rsa256_sign(this.private_key);
};
Client.prototype.validSignature = function (data) {
  const content = this.getSignContent(data);
  return content.rsa256_verify(this.alipay_public_key);
};
Client.prototype.execute = function (data) {
  data.sign = this.getSignature(data);
  data.sign_type = this.sign_type;
  return data;
};
Client.prototype.request = function (data, app_auth_token) {
  data.sign = this.getSignature(data);
  data.sign_type = this.sign_type;
  if (app_auth_token) data.app_auth_token = app_auth_token;
  return api.post(server_url, data).then(({ body }) => {
    return body;
  });
};
Object.assign(Client.prototype, pay, oauth);
module.exports = Client;
module.exports.source = 'alipay';
