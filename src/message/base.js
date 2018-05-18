/**
 * Created by gaojun on 17-3-7.
 */
// const config = require('../config');
const { Message } = require('../helps/message');

const base = new Message('/base', {
  * connect() {
    // console.log("base connect");
  },
  * disconnect() {
    // console.log('base disconnect');
  },
  * disconnecting() {
    // console.log('base disconnecting');
  },
});
base.use(function* (next) {
  // middle
  yield next;
});
base.event('event', function* () {
  return {};
});
module.exports = base;
