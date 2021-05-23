/**
 * Created by gaojun on 17-2-18.
 */
const debug = require('debug')('app:debug');
const request = require('request');
const http = require('http');
const zlib = require('zlib');
const config = require('../config');

function send(options) {
  return new Promise((resolve, reject) => {
    debug(options);
    request(options, (error, response) => {
      if (!error) {
        console.log('send', response.body);
        resolve({ body: response.body, res: response });
      } else {
        debug(error);
        reject(error || new Error('接口请求错误'));
      }
    });
  });
}

function formatUrl(url, data) {
  const paramList = url.match(/\{.*?\}/g);
  if (paramList && paramList.length > 0) {
    for (const k in paramList) {
      const key = paramList[k].substr(1, paramList[k].length - 2);
      const param = data[key];
      if (!param) return Promise.reject(new Error('参数错误'));
      url = url.replace(paramList[k], param);
      data[key] = null;
    }
  }
  return url;
}

function post(url, data, headers, options) {
  if (!headers) headers = {};
  if (!options) options = {};
  options.method = 'POST';
  options.url = url;
  options.body = data;
  options.headers = headers;
  return send(options);
}

function put(url, data, headers, options) {
  if (!headers) headers = {};
  if (!options) options = {};
  options.method = 'PUT';
  options.url = url;
  options.body = data;
  options.headers = headers;
  return send(options);
}

function form(url, data, headers, options) {
  if (!headers) headers = {};
  if (!options) options = {};
  options.method = 'POST';
  options.url = url;
  options.headers = headers;
  options.formData = data;
  return send(options);
}

function get(url, data, headers, options) {
  url = formatUrl(url, data);
  if (!options) options = {};
  url = `${url}?`;
  for (const i in data) {
    url = `${url}${i}=${data[i]}&`;
  }
  url = url.substring(0, url.length - 1);
  options.method = 'GET';
  options.url = url;
  options.headers = headers;
  return send(options);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];

      let error;
      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' +
          `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
          `Expected application/json but received ${contentType}`);
      }
      if (error) {
        console.error(error.message);
        // Consume response data to free up memory
        res.resume();
        reject(error);
        return;
      }

      let rawData = '';
      let output = null;

      try {
        if (res.headers['content-encoding'] === 'gzip') {
          const gzip = zlib.createGunzip();
          res.pipe(gzip);
          output = gzip;
        } else {
          output = res;
        }
        output.on('data', (chunk) => {
          chunk = chunk.toString('utf-8');
          rawData += chunk;
        });
        output.on('end', () => {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        });
      } catch (e) {
        console.log(e);
        reject(e);
      }
    });
    req.setTimeout(3000, () => {
      req.abort();
      reject(new Error('time-out'));
    });
    req.on('error', (e) => {
      req.abort();
      reject(e);
    });
  });
}

function wrap_get(server, api, data, d, buffer) {
  if (config.NODE_ENV === 'test') return Promise.resolve(d);
  return get(`http://${server.host}:${server.port}${api}`, data, { Token: server.token, 'Content-type': 'application/json' }).then(({ body }) => {
    if (buffer) return body;
    return JSON.parse(body);
  }).then((result) => {
    if (buffer) return result;
    if (result.status !== 200) throw Error(result.message);
    return result.result;
  });
}

function wrap_post(server, api, data, d, buffer) {
  if (config.NODE_ENV === 'test') return Promise.resolve(d);
  api = formatUrl(api, data);
  return post(`http://${server.host}:${server.port}${api}`, JSON.stringify(data), { Token: server.token, 'Content-type': 'application/json' }).then(({ body }) => {
    if (buffer) return body;
    return JSON.parse(body);
  }).then((result) => {
    if (buffer) return result;
    if (result.status !== 200) throw Error(result.message);
    return result.result;
  });
}

function wrap_post_form(server, api, data, d, buffer) {
  if (config.NODE_ENV === 'test') return Promise.resolve(d);
  api = formatUrl(api, data);
  return post(`http://${server.host}:${server.port}${api}`, null, { Token: server.token }, { formData: data }).then(({ body }) => {
    if (buffer) return body;
    return JSON.parse(body);
  }).then((result) => {
    if (buffer) return result;
    if (result.status !== 200) throw Error(`${result.status} ${result.message}`);
    return result.result;
  });
}

function wrap_proxy(server) {
  return {
    target: `http://${server.host}:${server.port}`,
    changeOrigin: true,
    headers: {
      Token: server.token,
    },
  };
}
module.exports.post = post;
module.exports.put = put;
module.exports.form = form;
module.exports.get = get;
module.exports.getJson = getJson;
module.exports.wrap_get = wrap_get;
module.exports.wrap_post = wrap_post;
module.exports.wrap_post_form = wrap_post_form;
module.exports.wrap_proxy = wrap_proxy;
