/**
 * Created by gaojie on 17-2-17.
 */
const debug = require('debug')('app:redis');
const redis = require('redis');
const commands = require('redis-commands');
const config = require('../config');
const middlewares = require('koa-middlewares');

const client = redis.createClient(config.redis);
const RedisInstance = function instance(i) {
  this.client = i;
};
RedisInstance.prototype.getClient = function getClient() {
  return this.client;
};
commands.list.forEach((command) => {
  RedisInstance.prototype[command] = function exec(...args) {
    const ctx = this;
    const arg = [];
    for (let i = 0; i < args.length; i++) {
      arg.push(args[i]);
    }
    debug(command, arg);
    return new Promise((resolve, reject) => {
      arg.push((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
      redis.RedisClient.prototype[command].apply(ctx.client, arg);
    });
  };
});
const RedisSub = function instance(i) {
  this.client = i;
};
RedisSub.prototype.channelMap = {};
RedisSub.prototype.isSub = false;
RedisSub.prototype.sub = function sub(channel, callBack, key) {
  if (!this.isSub) {
    this.client.on('message', (ch, message) => {
      const actionList = this.channelMap[ch];
      for (let i = 0; i < actionList.length; i++) {
        const action = actionList[i];
        action[1](message);
      }
    });
    this.isSub = true;
  }
  if (!this.channelMap[channel]) {
    this.client.subscribe(channel);
    this.channelMap[channel] = [];
  }
  this.channelMap[channel].push([key, callBack]);
};
RedisSub.prototype.unSub = function unSub(channel, key) {
  const actionList = this.channelMap[channel];
  for (let i = 0; i < actionList.length; i++) {
    const action = actionList[i];
    if (action[0] === key) {
      actionList.splice(i, 1);
      break;
    }
  }
};
RedisInstance.prototype.pub = function pub(channel, message) {
  this.client.publish(channel, message);
};
const store = middlewares.redisStore({
  client,
});
const subClient = redis.createClient(config.redis);
module.exports = new RedisInstance(client);
module.exports.redisSub = new RedisSub(subClient);
module.exports.store = store;
module.exports.newRedis = function newRedis() {
  return new RedisInstance(redis.createClient(config.redis));
};
// module.exports = Redis;
