var co = require('co');
const ms = require('humanize-ms');
const parser = require('cron-parser');
const safetimers = require('safe-timers');

var Agent = function () {
  this.task_num = 0;
};

Agent.prototype.loop = function (fn, wait) {
  let h = function () {
    co(fn).catch((err) => console.log(err)).then(() => getResult(wait))
      .then((timeout) => {
        if (timeout == 0) setImmediate(h)
        else safeTimeout(h, timeout)
      })
  }

  setImmediate(h)
};

Agent.prototype.cron = function (fn, cron) {
  getResult(cron).then((result) => {
    interval = parser.parseExpression(result);
    startCron(interval, function () { co(fn).catch((err) => console.log(err)) });
  })
  this.task_num++;
};

Agent.prototype.interval = function (fn, interval) {
  getResult(fn, interval).then((fn, interval) => {
    interval = ms(schedule.interval);
    safeInterval(function () { co(fn).catch((err) => console.log(err)) }, interval);
  })
  this.task_num++;
};

function getResult(fn) {
  if (typeof (fn) == 'string' || typeof (fn) == 'number') return Promise.resolve(fn);
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


module.exports = function () {
  return new Agent();
};
