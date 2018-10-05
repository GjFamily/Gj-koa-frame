/**
 * Created by gaojun on 17-2-18.
 */
const crypto = require('crypto');
const url = require('url');
const fs = require('fs');
const path = require('path');
const process = require('child_process');

// 加载扩展功能
module.exports.extend = function () {
  String.random = function () {
    return `${Date.now()}${Math.random()}`.hash_sha1();
  };
  String.randomString = function (length) {
    const x = 'qwertyuioplkjhgfdsazxcvbnm';
    let tmp = '';
    for (let i = 0; i < length; i++) {
      tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
    }
    return tmp;
  };
  String.randomInt = function (length) {
    const x = '0293857641';
    let tmp = '';
    for (let i = 0; i < length; i++) {
      tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
    }
    return tmp;
  };
  String.prototype.md5 = function (format = 'hex') {
    const c = crypto.createHash('MD5');
    c.update(this.toString());
    return c.digest(format);
  };
  String.prototype.hash_sha1 = function (format = 'hex') {
    const c = crypto.createHash('sha1');
    c.update(this.toString());
    return c.digest(format);
  };
  String.prototype.hmac_sha1 = function (key, format = 'hex') {
    const c = crypto.createHmac('sha1', key);
    c.update(this.toString());
    return c.digest(format);
  };
  String.prototype.rsa_sign = function (privateKey) {
    const c = crypto.createSign('RSA-SHA1');
    c.update(this.toString());
    return c.sign(privateKey, 'base64');
  };
  String.prototype.rsa_verify = function (publicKey, data) {
    const c = crypto.createVerify('RSA-SHA1');
    c.update(data);
    return c.verify(publicKey, this.toString(), 'base64');
  };
  String.prototype.save_log = function () {
    process.exec(`echo ${this.toString()} >> log.txt`);
    return this;
  };
  Date.prototype.format = function (format) {
    if (!format) format = 'yyyy-MM-dd';
    const o = {
      'M+': this.getMonth() + 1, // month
      'd+': this.getDate(), // day
      'h+': this.getHours(), // hour
      'm+': this.getMinutes(), // minute
      's+': this.getSeconds(), // second
      'q+': Math.floor((this.getMonth() + 3) / 3), // quarter
      S: this.getMilliseconds(), // millisecond
    };
    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (`${this.getFullYear()}`).substr(4 - RegExp.$1.length));
    }
    for (const k in o) {
      if (new RegExp(`(${k}`).test(format)) {
        format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : (`00${o[k]}`).substr((`${o[k]}`).length));
      }
    }
    return format;
  };
  Date.prototype.getRoughTime = function () {
    return Math.ceil(this.getTime() / 1000);
  };
  Date.prototype.getDayTime = function () {
    return Math.ceil(new Date(this.format()).getTime() / 1000);
  };
  Date.nowTime = function () {
    return Math.ceil(Date.now() / 1000);
  };
  Date.todayTime = function () {
    return Math.ceil(new Date(new Date().format()).getTime() / 1000);
  };
};
/**
 * 格式化链接
 * @param key
 * @param sub_key
 * @param params
 * @param protocol
 * @returns {{protocol: string, slashes: boolean, hostname: *, pathname: string, query: *}}
 */
module.exports.inline = function (key, sub_key, params, protocol = 'inline') {
  return url.format({
    protocol,
    slashes: true,
    hostname: key,
    pathname: `/${sub_key}`,
    query: params,
  });
};
/**
 * 格式化链接
 * @param data
 * @returns {*}
 */
module.exports.url = function (data) {
  return url.format(data);
};
/**
 * 解析url
 * @param url
 * @returns {*}
 */
module.exports.parse = function* (u) {
  return url.parse(u);
};
/**
 * 创建目录
 * @param dirpath
 * @param mode
 * @param callback
 */
module.exports.mkdirs = function (dirpath, mode, callback) {
  path.exists(dirpath, (exists) => {
    if (exists) {
      callback(dirpath);
    } else {
      exports.mkdirs(path.dirname(dirpath), mode, () => {
        fs.mkdir(dirpath, mode, callback);
      });
    }
  });
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
    const r = exports.mkdirSync(path.dirname(dirname), mode);
    if (r) {
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
  const dirs = [];
  let inner = () => {

  };

  function iterator(u, d) {
    const stat = fs.statSync(u);
    if (stat.isDirectory()) {
      d.unshift(u); // 收集目录
      inner(u, d);
    } else if (stat.isFile()) {
      fs.unlinkSync(url); // 直接删除文件
    }
  }

  inner = (p, d) => {
    const arr = fs.readdirSync(p);
    for (let i = 0; i < arr.length; i++) {
      const el = arr[i];
      iterator(`${p}/${el}`, d);
    }
  };
  try {
    iterator(dirname, dirs);
    for (let i = 0; i < dirs.length; i++) {
      const el = dirs[i];
      fs.rmdirSync(el); // 一次性删除所有收集到的目录
    }
    return true;
  } catch (e) {
    // 如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
    console.log(e);
    return true;
  }
};

module.exports.writeFile = function (file_path, buffer, over = false) {
  if (fs.existsSync(file_path)) {
    if (over) {
      // 更新
      exports.unlinkSync(file_path);
    } else {
      throw new Error('文件存在');
    }
  }
  if (!exports.mkdirSync(path.dirname(file_path))) {
    throw new Error('目录创建失败');
  }
  fs.writeFileSync(file_path, buffer);
  if (!fs.existsSync(file_path)) {
    throw new Error('上传失败');
  }
};

module.exports.saveFile = function (file_path, file, over = false) {
  if (fs.existsSync(file_path)) {
    if (over) {
      // 更新
      exports.unlinkSync(file_path);
    } else {
      throw new Error('文件存在');
    }
  }
  if (!exports.mkdirSync(path.dirname(file_path))) {
    throw new Error('目录创建失败');
  }
  let buffer = fs.readFileSync(file);
  fs.writeFileSync(file_path, buffer);
  if (!fs.existsSync(file_path)) {
    throw new Error('上传失败');
  }
};

module.exports.formatData = function (fields, data) {
  let _data = {};
  for (let i in fields) {
    let field = fields[i];
    if (data[field] || data[field] === 0 || data[field] === '' || data[field] === null) {
      _data[field] = data[field];
    }
  }
  return _data;
};

module.exports.listToMap = function (list, field) {
  let map = {};
  list.forEach((row) => {
    map[row[field]] = row;
  });
  return map;
};

module.exports.formatSeconds = function (value) {
  let secondTime = parseInt(value, 10); // 秒
  let minuteTime = 0;
  let hourTime = 0;
  if (secondTime > 60) {
    minuteTime = parseInt(secondTime / 60, 10);
    secondTime = parseInt(secondTime % 60, 10);
    hourTime = parseInt(minuteTime / 60, 10);
    minuteTime = parseInt(minuteTime % 60, 10);
  }
  if (hourTime >= 10) {
    hourTime = `${hourTime}`;
  } else {
    hourTime = `0${hourTime}`;
  }
  if (minuteTime >= 10) {
    minuteTime = `${minuteTime}`;
  } else {
    minuteTime = `0${minuteTime}`;
  }
  if (secondTime >= 10) {
    secondTime = `${secondTime}`;
  } else {
    secondTime = `0${secondTime}`;
  }
  return `${hourTime}:${minuteTime}:${secondTime}`;
};
