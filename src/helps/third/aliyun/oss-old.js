/**
 * Created by gaojun on 17-3-9.
 */
const config = require('../../../config');
const Base64 = require('../../../lib/base64');

const Types = {
  THUMB_1_1: '1',
  THUMB_2_2: '2',
};

const OSSAccessKeyId = config.aliyun.access_key;
const OSSAccessKeySecret = config.aliyun.access_secret;
const { host, path } = config.aliyun;
const null_pic = 'null_pic.jpg';
const separator = '/';
const expire = 30;

// 最大文件大小.用户可以自己设置
let condition = ['content-length-range', 0, 1048576000];
let conditions = [condition];

// 表示用户上传的数据,必须是以$dir开始
// 不然上传会失败,这一步不是必须项,只是为了安全起见,防止用户通过policy上传到别人的目录
let start = ['starts-with', '$key', path];
conditions.push(start);

const makeToken = function (child) {
  let end = Date.now() + (expire * 1000);
  let expiration = new Date(end).toISOString();

  let arr = { expiration, conditions };
  let policy = JSON.stringify(arr);
  let base64_policy = Base64.encode(policy);
  let signature = base64_policy.hmac_sha1(OSSAccessKeySecret, 'base64');
  return {
    OSSAccessKeyId,
    policy: base64_policy,
    signature,
    key: path + child,
    success_action_status: 200,
    host,
  };
};

const handle = function (url, type) {
  if (!url) url = `${host}${null_pic}`;
  switch (type) {
    case Types.THUMB_1_1:
      return `${url}${separator}thumb_100_100`;
    case Types.THUMB_2_2:
      return `${url}${separator}thumb_200_200`;
    default:
      return url;
  }
};

module.exports.makeToken = makeToken;
module.exports.handle = handle;
module.exports.Types = Types;
