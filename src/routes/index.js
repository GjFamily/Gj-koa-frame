import config from '../config';
import session from './session';
import token from './token';
import { SwaggerConfig } from '../helps/swagger';

const swaggerConfig = new SwaggerConfig({
  host: config.host,
});
swaggerConfig.addRouters(session, token);
module.exports = swaggerConfig.routes();
