/**
 * Created by gaojie on 17-2-18.
 */

var parse = function (cb, opts) {
  return function * (next) {
    let ctx = this;
    let req = ctx.request;
    let params = ctx.params;
    let kwarg = {};
    if (opts) {
      opts.map((value)=> {
        if (value.body) {// json格式，或者text格式
          kwarg[value.name] = req.body[value.name];
        } else if (value.query) {// 请求
          let v = req.query[value.name];
          kwarg[value.name] = value.array ? v.split(',') : v;
        } else if (value.path) {// 路径
          kwarg[value.name] = params[value.name];
        } else if (value.form) {// 表单提交
          kwarg[value.name] = req.body[value.name];
        } else if (value.default) {// 传递默认值
          kwarg[value.name] = value.default;
        } else if (value.cache) {
          kwarg[value.name] = ctx.cache[value.cache === true ? value.name : value.cache];
        } else if (value.all) {
          kwarg[value.name] = req.body;
        }
      });
    }
    try {
      if(!(cb instanceof Array)) cb = [cb];
      for(let index in cb){
        kwarg = yield (cb[index]).call(this, kwarg);
      }
      if(ctx.body) return ;
      ctx.body = {
        status: 200,
        result: kwarg
      };
      // 多个路由验证问题，需要规范扩展
      // yield next;
    } catch (err) {
      if(err.log || !err.no) ctx.log.error(err);
      ctx.body = {
        status: 500,
        message: err.message
      };
    }
  }
};

module.exports = parse;