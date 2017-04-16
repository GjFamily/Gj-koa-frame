/**
 * Created by gaojie on 2017/4/10.
 */
var redis = require('../tools/redis');
var co = require('co');
var tools = require('../helps/tools');

var Cache = function(instance){
  return {
    set: function (url, result, expire){
      url = urlFormat(url);
      result = JSON.stringify(result);
      return instance.setex(url, expire, result);
    },
    get: function (url){
      url = urlFormat(url);
      return instance.get(url)
        .then((result)=>{
          if(!result) return null;
          return JSON.parse(result);
        });
    },
    clear: function (url){
      url = urlFormat(url);
      return instance.del(url);
    },
    cache: function (url, callback, expire){
      url = urlFormat(url);
      return instance.get(url)
        .then((result)=>{
          if(!result){
            result = new Promise((resolve, reject) => {
              resolve(co(callback()))
            }).then((result)=>{
              if(result !== false)
                return instance.setex(url, expire, JSON.stringify(result))
                  .then(()=>{
                    return result;
                  });
              else
                return result;
            });
          }else{
            result = JSON.parse(result);
          }
          return result;
        });
    }
  }
};
var urlFormat = function(url){
  if(url instanceof Array){
    url[3] = 'cache';
    return tools.inline.apply(this, url);
  }else if(url instanceof Object){
    url.protocol = 'cache';
    return tools.url(url);
  }else{
    return url;
  }
};

module.exports = Cache(redis);
module.exports.class = Cache;
