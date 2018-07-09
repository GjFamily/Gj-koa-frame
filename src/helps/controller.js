/**
 * Created by gaojie on 17-2-18.
 */
const parse = function (cb, opts) {
  return function* () {
    const ctx = this;
    const req = ctx.request;
    let kwarg = {};
    if (opts) {
      opts.forEach((value) => {
        if (value.body) { // json格式，或者text格式
          kwarg[value.name] = req.body[value.name];
        } else if (value.query) { // 请求
          const v = req.query[value.name];
          kwarg[value.name] = value.array ? (v ? v.split(',') : []) : v;
        } else if (value.path) { // 路径
          kwarg[value.name] = ctx.params[value.name];
        } else if (value.form) { // 表单提交
          kwarg[value.name] = (req.fields && req.fields[value.name]) || req.body[value.name];
          if (value.array) kwarg[value.name] = kwarg[value.name] ? kwarg[value.name].split(',') : [];
        } else if (value.cache) {
          kwarg[value.name] = ctx.cache[value.cache === true ? value.name : value.cache];
        } else if (value.all) {
          kwarg[value.name] = req.body;
        }
        if (value.default && !kwarg[value.name]) {
          kwarg[value.name] = value.default;
        }
      });
    }
    try {
      if (!(cb instanceof Array)) cb = [cb];
      for (const index in cb) {
        const r = (cb[index]).call(this, kwarg);
        kwarg = yield r;
      }
      if (ctx.body) return;
      ctx.body = {
        status: 200,
        result: kwarg,
      };
      // 多个路由验证问题，需要规范扩展
      // yield next;
    } catch (err) {
      if (err.log || !err.no) {
        if (ctx.log) {
          ctx.log.error(err);
        } else {
          console.log(err);
        }
      }
      ctx.body = {
        status: 500,
        message: err.message,
      };
    }
  };
};
module.exports = parse;
