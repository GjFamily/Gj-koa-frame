const http = require('http');
const io = require('socket.io');
const co = require('co');
const util = require('util');
const events = require('events');
const config = require('../config');
// const adapterRedis = require('socket.io-redis');
// const redis = require('../tools/redis');
// const newRedis = require('../tools/redis').newRedis;

const WebSocket = function (server, opts) {
  this.io = io(server, opts);
  this.server = server;
};
WebSocket.prototype.use = function (fn) {
  co(fn(this.io));
};
WebSocket.prototype.listen = function (port) {
  this.server.listen(port);
};
const Message = function (name, opts) {
  this.io = null;
  this.name = name;
  this.ns = null;
  this.middleware = [];
  this.eventMap = {};
  this.opts = opts || {};
  events.EventEmitter.call(this);
};
util.inherits(Message, events.EventEmitter);
Message.prototype.use = function (next) {
  this.middleware.push(next);
};
Message.prototype.event = function (event, fn) {
  this.eventMap[event] = fn;
};
Message.prototype.events = function () {
  const self = this;
  return function* (sio) {
    self.io = sio;
    self.ns = sio.of(self.name);
    if (self.middleware.length > 0) {
      self.middleware.forEach((fn) => {
        self.ns.use((socket, next) => {
          let finish = false;
          co(fn.call(socket, function* (err) {
            finish = true;
            next(err);
          })).catch((err) => {
            if (!finish) next(err);
          });
        });
      });
    }
    self.ns.on('connect', (socket) => {
      if (config.debug) console.log(` ++++ ${self.name} connect:${JSON.stringify(socket.handshake.query)} ++++`);
      if (self.opts.connect) {
        co(self.opts.connect.call(socket, socket.handshake.query))
          .then(() => {
            if (config.debug) console.log(` ++++ ${self.name} new connect ++++`);
          }).catch((err) => {
            if (config.debug) console.log(` +++- ${self.name} connect error:${err} -+++`);
            socket.disconnect();
          });
      }
      for (const event in self.eventMap) {
        const fn = self.eventMap[event];
        socket.on(event, (...args) => {
          // 使用数组取出arguments
          let ack = null;

          // 如果最后一个参数是函数，则它为回调函数
          // pop() 移除数组中最后一个参数并将其返回
          if (typeof args[args.length - 1] === 'function') {
            ack = args.pop();
          }
          if (config.debug) console.log(` <=  ${self.name}:${event} : ${JSON.stringify(args)}  ack: ${(ack ? 'true' : false)}`);
          co(fn.apply(socket, args))
            .then((result) => {
              if (ack) {
                ack(result);
              }
              if (config.debug) console.log(`  => ${JSON.stringify(result)} ack:${(ack ? 'true' : false)}`);
            }).catch((err) => {
              if (ack) {
                ack({
                  error: err.no || -1,
                  message: err.message,
                });
              }
              if (config.debug) {
                console.log(`  => error:${err}`);
              }
            });
        });
      }
      if (self.opts.disconnecting) {
        // 还未离开房间
        socket.on('disconnecting', (reason) => {
          return co(self.opts.disconnecting.call(socket, reason));
        });
      }
      if (self.opts.disconnect) {
        socket.on('disconnect', (reason) => {
          return co(self.opts.disconnect.call(socket, reason));
        });
      }
      if (self.opts.error) {
        socket.on('error', (error) => {
          return co(self.opts.error.call(socket, error));
        });
      }
    });
  };
};
Message.prototype.to = function (room) {
  this.ns.to(room);
  return this;
};
Message.prototype.emit = function (event, message) {
  return this.ns.emit(event, message);
};
Message.prototype.in = function (room) {
  return this.to(room);
};
Message.prototype.count = function* (room, except) {
  return new Promise((resolve) => {
    this.ns.adapter.clients([room], (_, sid) => {
      return resolve(sid);
    });
  }).then((sid) => {
    if (except && except.id && sid.indexOf(except.id)) return sid.length - 1;
    return sid.length;
  });
};
// function messageManage(opts, messageList) {
//   this.opts = opts
//   this.messageList = messageList;
// }
// messageManage.prototype.opts = null;
// messageManage.prototype.io = null;
// messageManage.prototype.messageList = [];
// messageManage.prototype.setIo = function(io) {
//   this.io = io
//   for(let i = 0; i < this.messageList.length; i++) {
//     let message = this.messageList[i];
//     message.setIo(io)
//   }
//   return this
// }
// messageManage.prototype.start = function() {
//   this.io.on('connection', (socket) => {
//     for(let i = 0; i < this.messageList.length; i++) {
//       let message = this.messageList[i];
//       message.connection(socket)
//     }
//   })
// };
module.exports.Message = Message;
module.exports.defaultMessage = new Message('/');
module.exports.koa = (app, opts) => {
  opts = opts || {};
  const server = http.createServer(app.callback());
  // opts.adapter =
  // adapterRedis({ pubClient: redis.getClient(), subClient: newRedis().getClient() });
  return new WebSocket(server, opts);
};
