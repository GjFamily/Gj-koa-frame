const pay = require('./pay');
const public = require('./public');
const program = require('./program');
const api = require('../../api');
const cache = require('../../cache');
let server_url = "https://api.weixin.qq.com";
let pay_url = "https://api.mch.weixin.qq.com";
var Client = function (app_id, app_secret) {
  this.app_id = app_id;
  this.app_secret = app_secret;
  this.cache = cache;
};
Client.prototype.payInit = function (pid, app_key, partner_id, pfx, passphrase) {
  this.pid = pid;
  this.app_key = app_key;
  this.partner_id = partner_id;
  this.pfx = pfx;
  this.passphrase = passphrase;
}
Client.prototype.request = function (url, data) {
  return api.get(server_url + url, data).then((body, response) => {
    return JSON.parse(body);
  })
}
Client.prototype.post = function (url, data, headers, options) {
  return api.post(server_url + url, JSON.stringify(data), headers, options).then((body, response) => {
    return JSON.parse(body);
  })
}
Client.prototype.payPost = function (url, data, headers, options) {
  return api.post(pay_url + url, data, headers, options).then((body, response) => {
    return body;
  })
}
Object.assign(Client.prototype, pay, public, program);

module.exports = Client;
module.exports.source = 'weixin';
const user_model = require('../../../models/user');
module.exports.GENDER = user_model.GENDER;
