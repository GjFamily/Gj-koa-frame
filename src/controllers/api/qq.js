import QQ from '../../helps/third/qq';
import config from '../../config';

const client = new QQ(config.qq.app_id, config.qq.app_secret);

export default client;
