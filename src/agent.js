import tools from './helps/tools';
import Agent from './helps/agent';

const agent = Agent();

tools.extend();

agent.loop(() => {
  console.log('Task dispatch');
}, () => {
  return 10;
});

agent.cron(() => {
  console.log('Task clear');
}, '0 0 3 * * *');
