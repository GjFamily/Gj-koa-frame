/**
 * Created by gaojun on 17-2-18.
 */
var crypto = require('crypto');
var url = require('url');
var fs = require('fs');
var path = require('path');
var process = require('child_process');
// 加载扩展功能
module.exports.extend = function () {
    String.random = function () {
      return `${Date.now()}${Math.random()}`.hash_sha1()
    }
    String.randomString = function (length) {
      var x = "qwertyuioplkjhgfdsazxcvbnm";
      var tmp = "";
      for (var i = 0; i < length; i++) {
        tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
      }
      return tmp;
    }
    String.randomInt = function (length) {
      var x = "0293857641";
      var tmp = "";
      for (var i = 0; i < length; i++) {
        tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
      }
      return tmp;
    }
    String.prototype.md5 = function (format = 'hex') {
      var c = crypto.createHash('MD5');
      c.update(this.toString());
      return c.digest(format)
    }
    String.prototype.hash_sha1 = function (format = 'hex') {
      var c = crypto.createHash('sha1');
      c.update(this.toString());
      return c.digest(format);
    }
    String.prototype.hmac_sha1 = function (key, format = 'hex') {
      var c = crypto.createHmac('sha1', key);
      c.update(this.toString());
      return c.digest(format);
    }
    String.prototype.rsa_sign = function (privateKey) {
      var c = crypto.createSign('RSA-SHA1');
      c.update(this.toString());
      return c.sign(privateKey, 'base64');
    }
    String.prototype.rsa_verify = function (publicKey, data) {
      var c = crypto.createVerify('RSA-SHA1');
      c.update(data);
      return c.verify(publicKey, this.toString(), 'base64');
    }
    String.prototype.save_log = function () {
      process.exec(`echo ${this.toString()} >> log.txt`);
      return this
    }
    Date.prototype.format = function (format) {
      if (!format) format = 'yyyy-MM-dd';
      var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
      }
      if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
      }
      for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
          format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
      }
      return format;
    }
    Date.prototype.getRoughTime = function () {
      return Math.ceil(this.getTime() / 1000)
    };
    Date.prototype.getDayTime = function () {
      return Math.ceil(new Date(this.format()).getTime() / 1000)
    };
    Date.nowTime = function () {
      return Math.ceil(Date.now() / 1000)
    };
    Date.todayTime = function () {
      return Math.ceil(new Date(new Date().format()).getTime() / 1000)
    }
  }
  /**
   * 格式化链接
   * @param key
   * @param sub_key
   * @param params
   * @param protocol
   * @returns {{protocol: string, slashes: boolean, hostname: *, pathname: string, query: *}}
   */
module.exports.inline = function (key, sub_key, params, protocol = "inline") {
  return url.format({
    protocol: protocol,
    slashes: true,
    hostname: key,
    pathname: '/' + sub_key,
    query: params
  })
};
/**
 * 格式化链接
 * @param data
 * @returns {*}
 */
module.exports.url = function (data) {
    return url.format(data);
  }
  /**
   * 解析url
   * @param url
   * @returns {*}
   */
module.exports.parse = function* (url) {
  return url.parse(url);
};
/**
 * 创建目录
 * @param dirpath
 * @param mode
 * @param callback
 */
module.exports.mkdirs = function (dirpath, mode, callback) {
  path.exists(dirpath, function (exists) {
    if (exists) {
      callback(dirpath);
    } else {
      exports.mkdirs(path.dirname(dirpath), mode, function () {
        fs.mkdir(dirpath, mode, callback);
      })
    }
  })
};
/**
 * 同步创建目录
 * @param dirname
 * @param mode
 * @return boolean
 */
module.exports.mkdirSync = function (dirname, mode) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (exports.mkdirSync(path.dirname(dirname), mode)) {
      fs.mkdirSync(dirname, mode);
      return true;
    } else {
      return false;
    }
  }
};
/**
 * 同步删除目录
 * @param dirname
 * @param mode
 * @return boolean
 */
module.exports.rmdirSync = function (dirname) {
  if (!fs.existsSync(dirname)) {
    return true;
  }
  var dirs = [];

  function iterator(url, dirs) {
    var stat = fs.statSync(url);
    if (stat.isDirectory()) {
      dirs.unshift(url); //收集目录
      inner(url, dirs);
    } else if (stat.isFile()) {
      fs.unlinkSync(url); //直接删除文件
    }
  }

  function inner(path, dirs) {
    var arr = fs.readdirSync(path);
    for (var i = 0, el; el = arr[i++];) {
      iterator(path + "/" + el, dirs);
    }
  }
  try {
    iterator(dirname, dirs);
    for (var i = 0, el; el = dirs[i++];) {
      fs.rmdirSync(el); //一次性删除所有收集到的目录
    }
    return true;
  } catch (e) { //如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
    console.log(e);
    return true;
  }
};
