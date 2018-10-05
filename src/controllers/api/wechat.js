import Wechat from '../../helps/third/wechat';
import config from '../../config';

const client = new Wechat(config.wechat.app_id, config.wechat.app_secret);

export default client;
export const server_client = new Wechat(config.wechat_server.app_id, config.wechat_server.app_secret);
export function* auth({ code }) {
  return yield client.miniCode({ code });
}

export function* noticeMessage({ id, open_id, formId, message }) {
  let template_id = config.wechat.message_notice_id;
  let page = config.weight_url.replace('{id}', id);
  let data = {
    keyword1: {
      value: config.weixin.name,
    },
    keyword2: {
      value: message.substr(0, 20),
    },
    keyword3: {
      value: new Date().format('yyyy-MM-dd hh:mm:ss'),
    },
  };
  return yield client.miniSendMessage({ open_id, template_id, page, form_id: formId, data });
}

export function* messageList() {
  return yield client.miniMessageList();
}
