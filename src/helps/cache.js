/**
 * Created by gaojie on 2017/4/10.
 */
const debug = require('debug')('app:cache');
const redis = require('../tools/redis');
const co = require('co');
const tools = require('../helps/tools');

const urlFormat = function urlFormat(url) {
  if (url instanceof Array) {
    url[3] = 'cache';
    return tools.inline.apply(this, url);
  } else if (url instanceof Object) {
    url.protocol = 'cache';
    return tools.url(url);
  } else {
    return url;
  }
};

const Cache = function cache(instance) {
  return {
    set(url, result, expire) {
      url = urlFormat(url);
      result = JSON.stringify(result);
      debug(`set cache:${url}`);
      return instance.setex(url, expire, result);
    },
    get(url) {
      url = urlFormat(url);
      debug(`get cache:${url}`);
      return instance.get(url)
        .then((result) => {
          if (!result) return null;
          return JSON.parse(result);
        });
    },
    clear(url) {
      url = urlFormat(url);
      debug(`clear cache:${url}`);
      return instance.del(url);
    },
    batchClean(pattern) {
      debug(`batch clean cache:${pattern}`);
      return instance.keys(pattern.map(url => urlFormat(url)))
        .then((result) => {
          if (result.length > 0) {
            return instance.del(result);
          } else {
            return 0;
          }
        });
    },
    getClean(url, s = true) {
      url = urlFormat(url);
      debug(`get clean cache:${url}`);
      return instance.multi([
        ['get', url],
        ['del', url],
      ]).exec_atomic().then((replies) => {
        return s ? JSON.parse(replies[0]) : replies[0];
      });
    },
    cache(url, callback, expire) {
      url = urlFormat(url);
      return instance.get(url)
        .then((result) => {
          debug(`get cache:${url}(${result})`);
          if (!result) {
            result = Promise.resolve(co(callback()))
              .then((r) => {
                debug(`set cache:${url}(${r})`);
                if (r !== false) {
                  return instance.setex(url, expire, JSON.stringify(r))
                    .then(() => {
                      return r;
                    });
                } else {
                  return r;
                }
              });
          } else {
            result = JSON.parse(result);
          }
          return result;
        });
    },
    getIncr(url, fn, expire) {
      url = urlFormat(url);
      debug(`incr cache:${url}`);
      return instance.multi([
        ['INCR', url, fn],
        ['EXPIRE', url, expire],
      ]).exec_atomic().then((replies) => {
        return replies[0];
      });
    },
    count(url, expire) {
      url = urlFormat(url);
      debug(`count cache:${url}`);
      return instance.multi([
        ['INCR', url],
        ['EXPIRE', url, expire],
      ]).exec_atomic().then((replies) => {
        return replies[0];
      });
    },
  };
};

module.exports = Cache(redis);
module.exports.class = Cache;
