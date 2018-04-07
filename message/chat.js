/**
 * Created by gaojun on 17-3-7.
 */
// const config = require('../config');
const { Message } = require('../helps/message');

const chat = new Message('/base', {
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
chat.use(function* (next) {
  // middle
  yield next;
});
chat.event('event', function* () {
  return {};
});
module.exports = chat;
