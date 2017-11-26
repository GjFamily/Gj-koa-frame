/**
 * Created by gaojun on 17-3-7.
 */
const config = require('../config');
var { Message } = require('../helps/message');
var template = new Message("/template", {
  connect: function* ({ identity, platform, name }) {
    // console.log("base connect");
  },
  disconnect: function* () {
    // console.log('base disconnect');
  },
  disconnecting: function* () {
    // console.log('base disconnecting');
  }
});
template.use(function* (next) {
  // middle
  yield next;
});
template.event("event", function* () {
  return {}
});
module.exports = template;
