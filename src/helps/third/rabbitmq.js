const config = require('../../config');
const api = require('../api');

const headers = {
  'Content-Type': 'application/json',
};

export function generateAccount(username, password) {
  return api.put(`${config.mqtt.manager_server}/api/users/${username}`, JSON.stringify({
    password,
    tags: 'management',
  }), headers).then(() => {
    return Promise.resolve();
  });
}

export function updateAccountPermissions(username, { configure, write, read }) {
  configure = configure || '.*';
  write = write || '.*';
  read = read || '.*';
  return api.put(`${config.mqtt.manager_server}/api/permissions/${encodeURIComponent(config.mqtt.vhost)}/${username}`, JSON.stringify({
    username,
    vhost: config.mqtt.vhost,
    configure,
    write,
    read,
  }), headers).then(() => {
    return Promise.resolve();
  });
}
