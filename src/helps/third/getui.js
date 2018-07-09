import Getui, { Alert, ApnsInfo, TransmissionTemplate, SingleMessage, AppMessage } from 'getui-rest-sdk';

const config = require('../../config');

const option = {
  appId: config.getui.app_id,
  appSecret: config.getui.app_secret,
  appKey: config.getui.app_key,
  masterSecret: config.getui.master_secret,
};

const gt = new Getui(option);

let auth = gt.authSign();

function generateMessage(title, body, payload) {
  const alert = new Alert();
  alert.title = title;
  alert.body = body;
  const payload_str = JSON.stringify(payload);

  const apnsInfo = new ApnsInfo();
  apnsInfo.alert = alert;
  apnsInfo.customMsg = { payload_str };

  const template = new TransmissionTemplate();
  template.transmissionContent = payload_str;
  return { template, apnsInfo };
}

export function sendSingle(cid, title, body, payload) {
  let { template, apnsInfo } = generateMessage(title, body, payload);
  const singleMessage = new SingleMessage();
  singleMessage.template = template;
  singleMessage.apnsInfo = apnsInfo;

  const target = {
    cid,
  };

  return auth.then(() => {
    return gt.pushMessageToSingle(singleMessage, target);
  });
}

export function sendAll(title, body, payload) {
  let { template, apnsInfo } = generateMessage(title, body, payload);
  const appMessage = new AppMessage();
  appMessage.template = template;
  appMessage.apnsInfo = apnsInfo;
  appMessage.conditions = [];

  return auth.then(() => {
    return gt.pushMessageToApp(appMessage);
  });
}
