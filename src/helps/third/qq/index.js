
import * as open from './open';

const api = require('../../api');

const server_url = 'https://graph.qq.com';

const Client = function (app_id, app_secret) {
  this.app_id = app_id;
  this.app_secret = app_secret;
};
Client.prototype.get = function (url, data) {
  return api.get(server_url + url, data).then(({ body }) => {
    return JSON.parse(body);
  });
};
Client.prototype.request = function (url, data) {
  return api.get(server_url + url, data);
};
Client.prototype.post = function (url, data, headers, options) {
  return api.post(server_url + url, JSON.stringify(data), headers, options)
    .then(({ body }) => {
      return JSON.parse(body);
    });
};

Object.assign(Client.prototype, open);

module.exports = Client;
module.exports.source = 'qq';
