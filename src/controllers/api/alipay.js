import Alipay from '../../helps/third/alipay';
import config from '../../config';

const client = new Alipay(config.alipay.app_id, config.alipay.app_secret);

export default client;
export function* auth({ code }) {
  return yield client.miniCode({ code });
}
