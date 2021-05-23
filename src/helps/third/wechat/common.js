/* eslint-disable */
module.exports.jsApiConfig = function* ({ url }) {
  let { access_token } = yield getAccessToken(this);
  let { ticket } = yield getJsApiTicket(this, access_token);
  let noncestr = 'Wm3WZYTPz0wzccnW';
  let timestamp = new Date().getRoughTime();
  let signature = getSignature(noncestr, timestamp, url, ticket);
  return { timestamp, nonceStr, signature };
};
/**
 *
 * @param access_token
 * @returns {
   "errcode":0,
   "errmsg":"ok",
   "ticket":"bxLdikRXVbTPdHSM05e5u5sUoXNKd8-41ZO3MhKoyN5OfkWITDGgnr2fwJ0m9E8NYzWKVZvdVtaUgWvsdshFKA",
   "expires_in":7200
   }
 */
function* getJsApiTicket(client, access_token) {
  let data = {
    access_token: access_token,
    type: 'jsapi'
  };
  return yield client.request('/cgi-bin/ticket/getticket', data);
}

function getSignature(noncestr, timestamp, url, jsapi_ticket) {
  let str = `noncestr=${noncestr}jsapi_ticket=${jsapi_ticket}timestamp=${timestamp}url=${url}`
  return str.hash_sha1()
}
