const debug = require('debug')('app:agent');
const co = require('co');
const ms = require('humanize-ms');
const parser = require('cron-parser');
const safetimers = require('safe-timers');


function safeTimeout(fn, delay, ...args) {
  if (delay < safetimers.maxInterval) {
    setTimeout(fn, delay, ...args);
  } else {
    safetimers.setTimeout(fn, delay, ...args);
  }
}

function safeInterval(fn, delay, ...args) {
  if (delay < safetimers.maxInterval) {
    setInterval(fn, delay, ...args);
  } else {
    safetimers.setInterval(fn, delay, ...args);
  }
}

function getResult(fn) {
  if (typeof (fn) === 'string' || typeof (fn) === 'number') return Promise.resolve(fn);
  return co(fn);
}

function startCron(interval, listener) {
  const now = Date.now();
  let nextTick;
  do {
    nextTick = interval.next().getTime();
  } while (now >= nextTick);
  safeTimeout(() => {
    listener();
    startCron(interval, listener);
  }, nextTick - now);
}

const Agent = function () {
  this.task_num = 0;
};

Agent.prototype.loop = function (fn, wait) {
  this.task_num++;
  debug(`register loop: tasks(${this.task_num})`);
  const h = function () {
    debug('exec loop');
    co(fn)
      .catch((err) => {
        debug(err);
      }).then(() => getResult(wait))
      .then((timeout) => {
        debug(`loop wait:${timeout}`);
        if (timeout === 0) setImmediate(h);
        else safeTimeout(h, timeout);
      });
  };

  setImmediate(h);
};

Agent.prototype.cron = function (fn, cron) {
  this.task_num++;
  getResult(cron).then((result) => {
    debug(`register cron:${result} tasks(${this.task_num})`);
    const interval = parser.parseExpression(result);
    startCron(interval, () => {
      debug(`exec cron:${result}`);
      co(fn)
        .catch((err) => {
          debug(err);
        });
    });
  });
};

Agent.prototype.interval = function (fn, interval) {
  this.task_num++;
  getResult(interval).then((result) => {
    debug(`register interval:${result} tasks(${this.task_num})`);
    interval = ms(result);
    safeInterval(() => {
      debug(`exec interval:${result}`);
      co(fn).catch((err) => {
        debug(err);
      });
    }, interval);
  });
};


module.exports = function () {
  return new Agent();
};
