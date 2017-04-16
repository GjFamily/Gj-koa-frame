/**
 * Created by gaojun on 17-2-18.
 */
const request = require('request')

function send (options) {
  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        console.log(response.body)
        resolve(response.body)
      } else {
        console.log(error)
        reject(error || new Error('接口请求错误'))
      }
    })
  })
}

function formatUrl (url, data) {
  let paramList = url.match(/\{.*?\}/g)
  if (paramList && paramList.length > 0) {
    for (let k in paramList) {
      let key = paramList[k].substr(1, paramList[k].length - 2)
      let param = data[key]
      if (!param) return Promise.reject(new Error('参数错误'))
      url = url.replace(paramList[k], param)
      data[key] = null
    }
  }
}

function post(url, data, headers, options){
  if (!headers) headers = {}
  url = formatUrl(url, data)
  if(!options) options = {}
  options.method = 'POST'
  options.url = url
  options.body = JSON.stringify(data)
  options.headers = headers
  return send(options)
}

function get(url, data, options){
  url = formatUrl(url, data)
  if(!options) options = {}
  url = `${url}?`
  for (let i in data) {
    url = `${url}${i}=${data[i]}&`
  }
  url = url.substring(0, url.length - 1)
  options.method = 'GET'
  options.url = url
  return send(options)
}

function ssl(url, data, headers, options){
  return post(url, data, headers, options);
}

module.exports.post = post;

module.exports.get = get;

module.exports.ssl = ssl;