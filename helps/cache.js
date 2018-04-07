/**
 * Created by gaojie on 2017/4/10.
 */
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
      return instance.setex(url, expire, result);
    },
    get(url) {
      url = urlFormat(url);
      return instance.get(url)
        .then((result) => {
          if (!result) return null;
          return JSON.parse(result);
        });
    },
    clear(url) {
      url = urlFormat(url);
      return instance.del(url);
    },
    cache(url, callback, expire) {
      url = urlFormat(url);
      return instance.get(url)
        .then((result) => {
          if (!result) {
            result = Promise.resolve(co(callback())).then((r) => {
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
  };
};

module.exports = Cache(redis);
module.exports.class = Cache;
