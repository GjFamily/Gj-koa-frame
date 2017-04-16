/**
 * Created by gaojie on 17-2-17.
 */

var redis = require('redis');
var commands = require('redis-commands');
var config = require('../config');
var middlewares = require('koa-middlewares');


var client = redis.createClient(config.redis);

var redisInstance = function(client){
  this.client = client;
};

commands.list.forEach(function (command) {
  redisInstance.prototype[command] = function(){
    var ctx = this;
    var arg = [];
    for(var key in arguments) {
      arg.push(arguments[key]);
    }
    if(config.debug) console.log(command, arg);
    return new Promise((resolve, reject)=>{
      arg.push(function(err, result){
        if(err){
          reject(err);
        }else{
          resolve(result);
        }
      });
      redis.RedisClient.prototype[command].apply(ctx.client, arg);
    })
  }
});

var redisSub = function(client){
  this.client = client;
};
redisSub.prototype.channelMap = {};
redisSub.prototype.isSub = false;
redisSub.prototype.sub = function (channel, callBack, key) {
  if (!this.channelMap[channel]) {
    this.client.subscribe(channel);
    this.channelMap[channel] = []
  }
  this.channelMap[channel].push([key, callBack]);
  if (!this.isSub) {
    this.client.on('message', (channel, message) => {
      let actionList = this.channelMap[channel];
      for (let i = 0; i < actionList.length; i++) {
        let action = actionList[i];
        action[1](message)
      }
    })
  }
};
redisSub.prototype.unSub = function (channel, key) {
  let actionList = this.channelMap[channel];
  for (let i = 0; i < actionList.length; i++) {
    let action = actionList[i];
    if (action[0] === key) {
      actionList.splice(i, 1);
      break
    }
  }
};
redisInstance.prototype.pub = function (channel, message) {
  this.client.publish(channel, message)
};

var store = middlewares.redisStore({
  client: client
});



let subClient = redis.createClient(config.redis);

module.exports = new redisInstance(client);

module.exports.redisSub = new redisSub(subClient);
module.exports.store = store;
module.exports.client = client;
// module.exports = Redis;
