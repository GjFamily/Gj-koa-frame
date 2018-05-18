// const config = require('./config');

const tools = require('./helps/tools');
const agent = require('./helps/agent')();

tools.extend();

agent.loop(() => {
  console.log('Task dispatch');
}, () => {
  return 10;
});

agent.cron(() => {
  console.log('Task clear');
}, '0 0 3 * * *');
