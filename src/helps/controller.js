import debug from 'debug';
import { SystemException } from './exception';

const debuger = debug('app:controller');
/**
 * Created by gaojie on 17-2-18.
 */
const parse = function (cb, opts) {
  return function* ControllerMiddleware() {
    const ctx = this;
    const req = ctx.request;
    let kwarg = {};
    if (opts) {
      for (const key in opts) {
        let param = opts[key];
        let name = param.name || key;
        switch (param.in) {
          case 'body':
            // json格式，或者text格式
            kwarg[name] = req.body[name];
            break;
          case 'query':
            // 请求
            kwarg[name] = param.array ? (req.query[name] ? req.query[name].split(',') : []) : req.query[name];
            break;
          case 'path':
            // 路径
            kwarg[name] = ctx.params[name];
            break;
          case 'form':
          case 'file':
            // 表单提交
            kwarg[name] = (req.fields && req.fields[name]) || req.body[name];
            if (param.array) kwarg[param.name] = kwarg[name] ? kwarg[name].split(',') : [];
            break;
          case 'cache':
            kwarg[name] = ctx.cache[param.cache === true || !param.cache ? name : param.cache];
            break;
          case 'header':
            break;
          case 'cookie':
            break;
          case 'all':
            kwarg[name] = req.body;
            break;
          default:
            continue;
        }
        if (param.default && !kwarg[name]) {
          kwarg[name] = param.default;
        }
        debuger(kwarg);
      }
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
      let e = err;
      if (!e.no) {
        e = SystemException(e, err.stack);
        if (ctx.log) {
          ctx.log.error(err);
        } else {
          debuger(err);
        }
      } else if (e.log) {
        if (ctx.log) {
          ctx.log.error(e);
        } else {
          debuger(e);
        }
      }
      ctx.body = {
        status: e.no ? e.no : 500,
        message: e.message,
        result: e.info,
      };
    }
  };
};
module.exports = parse;
module.exports.response = function (result, type) {
  return {
    status: {
      type: 'int',
      required: true,
      description: '状态',
    },
    result: {
      type: type || Object,
      required: true,
      schema: result,
    },
  };
};
module.exports.ExceptionResponse = {
  schema: {
    status: {
      type: 'int',
      required: true,
      description: '状态',
    },
    message: {
      type: String,
      required: true,
      description: '错误信息',
    },
  },
};
module.exports.IdResponse = {
  schema: {
    status: {
      type: 'int',
      required: true,
      description: '状态',
    },
    result: {
      type: Object,
      required: true,
      object: {
        id: {
          type: 'int',
          required: true,
        },
      },
    },
  },
  alias: 'IdResponse',
};
module.exports.ApiResponse = {
  schema: {
    status: {
      type: 'int',
      required: true,
      description: '状态',
    },
  },
  alias: 'ApiResponse',
};
