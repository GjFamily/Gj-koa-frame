import Taobao from '../../helps/third/taobao';
import config from '../../config';

const client = new Taobao(config.taobao.app_key, config.taobao.app_secret);

export default client;
