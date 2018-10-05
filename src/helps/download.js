const fs = require('fs');
const crypto = require('crypto');
const imageinfo = require('imageinfo');
const zlib = require('mz/zlib');
const mime = require('mime-types');
const compressible = require('compressible');


function loadFile(filename, options) {
  let obj = {};
  obj.path = filename;
  let stats = options.stat || fs.statSync(filename);
  obj.cacheControl = options.cacheControl;
  obj.maxAge = obj.maxAge ? obj.maxAge : options.maxAge || 0;
  obj.type = mime.lookup(filename) || 'application/octet-stream';
  obj.mtime = stats.mtime;
  obj.length = stats.size;
  obj.buffer = fs.readFileSync(filename);
  obj.md5 = crypto.createHash('md5').update(obj.buffer).digest('base64');
  return obj;
}

function parseBuffer(buffer, options) {
  return {
    cacheControl: options.cacheControl,
    buffer,
    type: 'application/octet-stream',
    length: buffer.length,
    md5: crypto.createHash('md5').update(buffer).digest('base64'),
    maxAge: 0,
    mtime: new Date(),
  };
}
/**
 * 下载文件
 * @param file
 * @param buffer
 * @returns {Promise|Promise.<TResult>|*}
 */
module.exports = function* Download({ file = false, buffer = false, options = {} }) {
  let o = null;
  if (file && fs.existsSync(file)) {
    o = loadFile(file, options);
  } else if (buffer && buffer.length > 0) {
    o = parseBuffer(buffer);
  } else {
    this.status = 404;
    return null;
  }
  let enableGzip = !!options.gzip;
  this.status = 200;
  this.response.lastModified = o.mtime;
  if (this.fresh) {
    this.status = 304;
    return null;
  }
  if (options.image) {
    let file_info = imageinfo(o.buffer);
    this.type = file_info.mimeType;
  } else {
    this.type = o.type;
  }
  this.set('Cache-Control', o.cacheControl || `public, max-age=${o.maxAge}`);
  if (o.md5) this.set('Content-MD5', o.md5);
  if (this.method === 'HEAD') return null;

  if (options.filename) {
    this.attachment(`${options.filename}`);
  }

  // this.length = o.zipBuffer ? o.zipBuffer.length : o.length;
  let acceptGzip = this.acceptsEncodings('gzip') === 'gzip';
  // if (o.zipBuffer && acceptGzip) {
  //   this.set('Content-Encoding', 'gzip');
  //   this.body = o.zipBuffer;
  //   return null;
  // }

  let shouldGzip = enableGzip
    && o.length > 1024
    && acceptGzip
    && compressible(o.type);
  // console.log(enableGzip, acceptGzip, compressible(o.type));

  if (o.buffer) {
    if (shouldGzip) {
      o.zipBuffer = yield zlib.gzip(o.buffer);
      this.set('Content-Encoding', 'gzip');
      this.length = o.zipBuffer.length;
      this.body = o.zipBuffer;
    } else {
      this.length = o.length;
      this.body = o.buffer;
    }
    return null;
  }

  let stream = fs.createReadStream(o.path);

  // update file hash
  if (!o.md5) {
    let hash = crypto.createHash('md5');
    stream.on('data', hash.update.bind(hash));
    stream.on('end', () => {
      o.md5 = hash.digest('base64');
    });
  }
  if (options.delete) {
    stream.on('close', () => {
      fs.unlinkSync(file);
    });
  }

  this.length = o.length;
  this.body = stream;
  // enable gzip will remove content length
  if (shouldGzip) {
    this.remove('Content-Length');
    this.set('Content-Encoding', 'gzip');
    this.body = stream.pipe(zlib.createGzip());
  }
};
