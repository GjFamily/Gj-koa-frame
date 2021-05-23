import Wechat from '../../helps/third/wechat';
import userModel from '../../models/user';
import config from '../../config';
import path from 'path';

const client = new Wechat(config.wechat.app_id, config.wechat.app_secret);

export default client;
export const server_client = new Wechat(config.wechat_server.app_id, config.wechat_server.app_secret);
export const public_client = new Wechat(config.wechat_public.app_id, config.wechat_public.app_secret);
export const program_client = new Wechat(config.wechat_program.app_id, config.wechat_program.app_secret);
export function* auth({ code }) {
  return yield client.miniCode({ code });
}

export function* noticeMessage({ id, open_id, formId, message }) {
  let template_id = config.wechat.message_notice_id;
  let page = config.weight_url.replace('{id}', id);
  let data = {
    keyword1: {
      value: config.wechat.name,
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

function* handelMessage(data) {
  let result = null;
  const msgType = data.MsgType.toUpperCase();
  if (msgType !== 'EVENT') return result;
  const eventType = data.Event.toUpperCase();
  if (eventType === 'SCAN' || eventType === 'SUBSCRIBE') {
    let user;
    const info = yield public_client.getUserInfo(data.FromUserName);
    user = yield userModel.getByWechatUnionId(info.unionid);
    if (!user) {
      if (data.EventKey) {
        let user_id = data.EventKey;
        if (user_id.indexOf('_') >= 0) user_id = data.EventKey.split('_')[1];
        user = yield userModel.get(user_id);
        if (user) yield userModel.put(user.id, { wechat_union_id: info.unionid });
      }
    }
    if (!user) {
      user = yield userModel.add({ nickname: info.nickname, avatar: info.headimgurl, wechat_union_id: info.unionid });
    }
    if (user.public === 1) {
      result = '感谢您对WritePass论文查重检测的支持，您的账号已领取过免费资格，不能重复领取哦！更多免费机会可进入网站参与领取！\n';
    } else {
      yield userModel.put(user.id, { public: 1 });
      result = '感谢您对WritePass论文查重检测的支持，您的账号已获得一次免费资格，请提交检测！\n';
    }
  } else if (eventType === 'UNSUBSCRIBE') {
    // const info = yield public_client.getUserInfo(data.FromUserName);
    // const user = yield userModel.getByWechatUnionId(info.unionid);
  }

  return result;
}

export function* validMessage({ echostr }) {
  this.body = echostr;
}

export function* message({ content }) {
  try {
    const xml = yield public_client.parseMessage(content);
    if (xml.MsgType.toUpperCase() === 'MINIPROGRAMPAGE') {
      const mediaId = yield program_client.getMediaId({ file: path.resolve(config.PROJECT_PATH, 'qr_code1.png') });
      yield program_client.sendImageMessage({ mediaId, open_id: xml.FromUserName });
      this.body = 'success';
    } else {
      const text = yield handelMessage(xml);
      this.body = public_client.replayTextMessage(xml, text);
    }
  } catch (err) {
    console.log('wechat message handle err:', err);
    this.body = '';
  }
  if (this.body) this.set('Content-Type', 'text/xml');
}

export function* messageList() {
  return yield client.miniMessageList();
}
