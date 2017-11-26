const config = require('./config');

var tools = require('./helps/tools');
tools.extend();
var agent = require('./helps/agent')();

agent.loop(function* () {
  console.log("Task dispatch");
}, function* () {
  return 10;
});

agent.cron(function* () {
  console.log("Task clear");
}, '0 0 3 * * *');
