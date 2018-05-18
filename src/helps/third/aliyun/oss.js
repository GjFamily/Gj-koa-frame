const OSS = require('ali-oss');
const config = require('../../../config');

let { STS } = OSS;

const client = new STS({
  accessKeyId: config.aliyun.access_key,
  accessKeySecret: config.aliyun.access_secret,
});

export const BUCKETS = config.aliyun.oss_bucket;

export function* generateToken(policy) {
  let result = yield client.assumeRole(config.aliyun.oss_role_arn, policy, config.aliyun.oss_expire_time);
  return {
    AccessKeyId: result.credentials.AccessKeyId,
    AccessKeySecret: result.credentials.AccessKeySecret,
    SecurityToken: result.credentials.SecurityToken,
    Expiration: result.credentials.Expiration,
    Region: config.aliyun.oss_region,
    Bucket: config.aliyun.oss_bucket.base_bucket,
  };
}

export function* uploadToken(bucket_name, path) {
  path = `/${path}/*` || '/*';
  return yield generateToken({
    Statement: [{
      Action: [
        'oss:*',
      ],
      Effect: 'Allow',
      Resource: [
        `acs:oss:*:*:${bucket_name}${path}`,
        `acs:oss:*:*:${bucket_name}`,
      ],
    }],
    Version: '1',
  });
}
