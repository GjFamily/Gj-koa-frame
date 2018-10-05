
import { ApiClient } from 'taobao-sdk';
import * as tools from './tools';

const Client = function (app_key, app_secret) {
  this.app_key = app_key;
  this.app_secret = app_secret;
  this.client = new ApiClient({
    appkey: app_key,
    appsecret: app_secret,
  });
};

Client.prototype.exec = function (...args) {
  return new Promise((resolve, reject) => {
    args.push((error, response) => {
      if (!error) resolve(response);
      else reject(error);
    });
    this.client.execute(...args);
  });
};

Object.assign(Client.prototype, tools);

module.exports = Client;
module.exports.source = 'taobao';
