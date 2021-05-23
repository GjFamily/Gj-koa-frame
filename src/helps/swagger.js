
import koaRouter from 'koa-router';
import koaBetterBody from 'koa-better-body';
import yaml from 'yaml';
import debug from 'debug';
import config from '../config';
import parse from './controller';
import { middleware as authMiddleware } from './auth';
import download from './download';

export const FORM_CONSUME = 'application/x-www-form-urlencoded';
export const FILE_CONSUME = 'multipart/form-data';
export const JSON_CONSUME = 'application/json';

export const JSON_PRODUCE = 'application/json';
export const IMAGW_PRODUCE = 'image/png';
export const DOWN_PRODUCE = 'application/octet-stream';
export const TEXT_PRODUCE = 'text/plain';

export const int = 'int';
export const float = 'float';
export const File = 'file';

export const Path = 'path';
export const Query = 'query';
export const Header = 'header';
export const Cookie = 'cookie';
export const Body = 'body';
export const Form = 'form';
export const All = 'all';
export const Cache = 'cache';
const debuger = debug('app:swagger');
const IN_MAP = {
  [Path]: Path,
  [Query]: Query,
  [Header]: Header,
  [Cookie]: Cookie,
};

const TYPE_MAP = {
  [int]: 'integer',
  [float]: 'number',
  [String]: 'string',
  [Object]: 'object',
  [Array]: 'array',
  [Boolean]: 'boolean',
  [File]: 'string',
  string: 'string',
  int: 'integer',
  integer: 'integer',
  number: 'number',
  float: 'number',
  bool: 'boolean',
  boolean: 'boolean',
  array: 'array',
  object: 'object',
  file: 'string',
};

function isEmptyObject(obj) {
  if (!obj) return true;
  for (const n in obj) {
    return false;
  }
  return true;
}
function formatPath(path) {
  return path.replace(/:([^/?:&]+)(\/)?/, '{$1}$2');
}
function fixParam(param, key) {
  if (!param.name) param.name = key;
  if (param.in) return param;
  if (param.cache) param.in = Cache;
  else if (param.body) param.in = Body;
  else if (param.form) param.in = Form;
  else if (param.file) {
    param.in = File;
  } else if (param.path) param.in = Path;
  else if (param.header) param.header = Header;
  else if (param.cookie) param.cookie = Cookie;
  else if (param.query) param.in = Query;
  else if (param.all) param.in = All;
  else throw new Error(`Swagger: param in error,must cache, form, file, path, query (${JSON.stringify(param)}`);
  return param;
}

function pathToAlias(path) {
  return path.replace(/\?.*/, '').split('/')
    .filter(i => i.indexOf('{') === -1)
    .map(i => i.toLowerCase().replace(/( |^)[a-z]/g, L => L.toUpperCase()))
    .join('');
}
function aliasWithParent(alias, parentAlias) {
  return `${parentAlias}${alias.replace(/( |^)[a-z]/g, L => L.toUpperCase())}`;
}

class SecurityManager {
  constructor() {
    this.schemaMap = {};
    this.middlewares = {};
    this.defaults = [];
    this.fail = function* (ctx) {
      ctx.body = '401 Unauthorized';
      ctx.status = 401;
    };
    this.generateMiddle = {};
  }
  schemes() {
    return this.schemaMap;
  }
  // location: header, cookie, query
  key(name, location, middleware, def = false) {
    this.schemaMap[name] = {
      type: 'apiKey',
      name,
      in: location,
    };
    this.middlewares[name] = middleware;
    if (def) this.defaults.push(name);
    return name;
  }
  middleware(list) {
    if (!list) {
      list = this.defaults;
    }
    let key = list.join(',');
    if (!this.generateMiddle[key]) {
      this.generateMiddle[key] = authMiddleware(list.map(row => this.middlewares[row]), this.fail);
    }
    return this.generateMiddle[key];
  }
  onFail(middleware) {
    this.fail = middleware;
  }
}
export class SwaggerRouter {
  // required: prefix, tags:{name:description}, title, description, version, name
  // option: url, contact:{ name, url, email }, produce, consume
  constructor(options) {
    options = options || {};
    let self = this;
    let url = options.url || 'swagger';
    let tags = [];
    if (options.tags) {
      for (const i in options.tags) {
        tags.push({ name: i, description: options.tags[i] });
      }
    }

    this.basePath = options.basePath || options.prefix;
    this.name = options.name || options.title || '';
    this.url = `${this.basePath}/${url}`;
    this.produce = options.produce || JSON_PRODUCE;
    this.consume = options.consume || JSON_CONSUME;
    this.tags = options.tags || {};
    this.parent = null;
    this.paths = {};
    this.servers = [];
    this.responses = {};
    this.definitions = {};
    this.refDefinitions = {};
    this.definitionRandom = 0;
    this.security = new SecurityManager();

    this.router = koaRouter(options);
    if (config.debug || options.force) {
      let getInfo = () => {
        return {
          openapi: '3.0.0',
          info: {
            title: options.title || 'title',
            description: options.description || 'description',
            version: options.version || 'version',
            contact: self.contact || self.parent.contact,
          },
          servers: self.servers,
          tags,
          paths: self.paths,
          components: {
            securitySchemes: self.security.schemes(),
            schemas: self.definitions,
          },
        };
      };

      this.router.get(`/${url}.json`, function* () {
        this.body = JSON.stringify(getInfo(), null, 4);
      });
      debuger(`Swagger register:${this.basePath}/${url}.json`);
      this.router.get(`/${url}.yaml`, function* () {
        this.body = yaml.stringify(getInfo());
      });
      debuger(`Swagger register:${this.basePath}/${url}.yaml`);
    }
  }
  registerServer(url, description, schema) {
    let server = {
      url,
      description,
    };
    if (!isEmptyObject(schema)) {
      server.variables = {};
      for (const key in schema) {
        let item = {
          default: schema[key].default,
        };
        if (schema[key].enum) item.enum = schema[key].enum;
        server.variables[schema.name || key] = item;
      }
    }
    this.servers.push(server);
  }
  registerResponse(status, description, res, alias) {
    this.responses[status] = {
      description,
      content: this._parseContent(this.produce, res, alias || res.alias),
    };
    return status;
  }
  registerSchema(schema, alias) {
    return this._parseObject(schema, alias);
  }
  use(middleware) {
    this.router.use(middleware);
  }
  get(...options) {
    this._parsePath('get', options);
    this.router.get(...options);
  }
  post(...options) {
    this._parsePath('post', options);
    this.router.post(...options);
  }
  put(...options) {
    this._parsePath('put', options);
    this.router.put(...options);
  }
  delete(...options) {
    this._parsePath('delete', options);
    this.router.delete(...options);
  }
  // required: controller, summary, description, params:{name, description, type, required, in, schema, alias}, responses:{name, required, description, schema, alias}
  // option: security[], tags[],deprecated
  _parsePath(method, options) {
    let path = formatPath(options[0]);
    let index = options.findIndex(item => typeof (item) === 'object');
    if (index === -1) return;
    let option = options[index];
    if (!this.paths[path]) {
      this.paths[path] = {};
    }
    if (this.paths[path][method]) {
      throw new Error(`Swagger parse:${method}:${path} exist!`);
    }
    if (isEmptyObject(option.responses)) {
      throw new Error(`Swagger: ${method}:${path} responses not defined`);
    }
    if (!option.controller) {
      throw new Error(`Swagger: ${method}:${path} controller not defined`);
    }
    debuger(`Swagger parse:${method}:${path}`);

    let controller = option.controller instanceof Array ? option.controller : [option.controller];
    let consume = option.consume || this.consume;
    let produce = option.product || this.produce;
    let parameters = [];
    let body = [];
    if (option.params) {
      for (const key in option.params) {
        let param = option.params[key];
        fixParam(param, key);
        if (param.in === Cache) continue;
        if (param.in === File) {
          consume = FILE_CONSUME;
          // 添加body解析，添加在controller之前
          options.splice(index, 0, koaBetterBody());
          index += 1;
        } else if (param.in === Form && consume !== FORM_CONSUME && consume !== FILE_CONSUME) {
          consume = FORM_CONSUME;
        }
        if (IN_MAP[param.in]) {
          parameters.push(param);
        } else if (param.in === All) {
          body = param.schema;
        } else if (body instanceof Array) {
          body.push(param);
        }
      }
    }
    if (option.download || option.image) {
      produce = option.image ? IMAGW_PRODUCE : DOWN_PRODUCE;
      controller.push(download);
      option.responses = {
        field: {
          in: File,
        },
      };
    }
    let settings = {
      summary: option.summary || '',
      description: option.description || '',
      parameters: parameters.map(p => this._parseParam(p)),
      responses: this._parseResponse(produce, option.responses, path),
    };
    if (option.deprecated) settings.deprecated = true;

    this._parseBody(settings, consume, body, path);
    this._parseTags(settings, option.tags);
    let ss = this._parseSecurity(settings, option.security);
    if (ss) {
      options.splice(index, 0, ss);
      index += 1;
    }
    this.paths[path][method] = settings;
    // 重置controller操作
    options[index] = parse(controller, option.params);
  }
  _parseParam(param) {
    let p = {
      name: param.name,
      in: IN_MAP[param.in],
      required: param.required,
      schema: this._parseField(param.name, param),
    };
    if (param.deprecated) p.deprecated = true;
    return p;
  }
  _parseField(name, field, parentAlias = false) {
    if (!(field instanceof Object)) {
      throw new Error(`Swagger:parseField need object(${JSON.stringify(field)})`);
    }
    let info = {
      type: TYPE_MAP[field.type] || 'string',
    };
    if (field.description) info.description = field.description;
    if (field.format) info.format = field.format;
    if (field.in === File || field.type === File) info.format = 'binary';
    if (field.schema || field.object) {
      let object = this._parseObject(field.schema || field.object, field.alias || aliasWithParent(name, parentAlias), !!field.schema);
      if (object.$ref) {
        info = object;
      } else {
        info = Object.assign(info, object);
      }
    }
    return info;
  }
  _parseContent(mediaType, content, alias) {
    if (isEmptyObject(content)) {
      throw new Error(`Swagger:parseContent need array or object(${JSON.stringify(content)}${alias})`);
    }
    if (content.alias && isEmptyObject(content.schema)) {
      throw new Error(`Swagger:parseContent alias must have schema(${JSON.stringify(content)}${alias})`);
    }
    if (content.field && !isEmptyObject(content.field)) {
      return {
        [mediaType]: {
          schema: this._parseField(alias, content.field, alias),
        },
      };
    } else {
      return {
        [mediaType]: {
          schema: this._parseObject((content.schema instanceof Object) ? content.schema : content, alias, !!(content.schema instanceof Object)),
        },
      };
    }
  }
  _parseObject(object, alias, schema = true) {
    if (!(object instanceof Object)) {
      throw new Error(`Swagger:parseObject need array or object(${JSON.stringify(object)}${alias})`);
    }
    // object已经被注册
    if (object.$ref) return object;
    if (object.type === 'array') {
      return {
        type: 'array',
        items: object.field ? this._parseField(object.field, alias) : this._parseObject(object.schema, alias),
      };
    }
    if (!schema) {
      for (const key in this.definitions) {
        if (object !== this.definitions[key]) continue;
        return {
          $ref: `#/components/schemas/${key}`,
        };
      }
    }

    let properties = {};
    let required = [];
    for (const key in object) {
      let item = object[key];
      let name = item.name || key;
      properties[name] = this._parseField(name, item, alias);
      if (item.required) required.push(name);
    }

    let key = alias || `Object${this.definitionRandom++}`;
    let o = {
      type: 'object',
      properties,
    };
    if (required.length > 0) o.required = required;
    if (!schema) return o;

    this.definitions[key] = o;
    this.refDefinitions[key] = object;
    return {
      $ref: `#/components/schemas/${key}`,
    };
  }
  _parseResponse(mediaType, responses, path) {
    if (isEmptyObject(responses)) {
      throw new Error(`Swagger:parseResponse need object(${JSON.stringify(responses)}${path})`);
    }
    let r = Object.assign({}, this.responses);
    // 设定200为默认response
    if (!responses[200]) responses = { 200: responses };
    for (let k in responses) {
      let rr = responses[k];
      r[k] = {
        description: rr.description || '',
        content: this._parseContent(mediaType, rr, rr.alias || pathToAlias(path)),
      };
    }
    return r;
  }
  _parseBody(settings, mediaType, body, path) {
    if (body instanceof Array) {
      if (isEmptyObject(body)) return;
      settings.requestBody = {
        required: true,
        content: this._parseContent(mediaType, body, pathToAlias(path)),
      };
    } else if (body instanceof Object) {
      console.log(body);
      settings.requestBody = {
        description: body.description,
        required: true,
        content: this._parseContent(mediaType, body, body.alias || pathToAlias(path)),
      };
    }
  }
  _parseTags(settings, tags) {
    if (tags) {
      settings.tags = tags
        .filter(tag => this.tags[tag]);
    }
  }
  _parseSecurity(settings, security) {
    if (security) {
      let result = security.filter(s => this.security.middlewares[s]);
      settings.security = result.map((s) => { return { [s]: [] }; });
      return this.security.middleware(result);
    } else {
      settings.security = this.security.defaults.map((s) => { return { [s]: [] }; });
      return this.security.middleware();
    }
  }
  routes() {
    return this.router.routes();
  }
  setParent(parent) {
    this.parent = parent;
  }
}
export class SwaggerConfig {
  // required: prefix
  // option: url, contact:{ name, url, email },
  constructor(options) {
    options = options || {};
    let self = this;
    this.dom_id = options.dom_id || '#swagger-ui';
    this.validatorUrl = options.validatorUrl || 'https://online.swagger.io/validator';
    this.url = options.url || 'swagger-config';
    this.urls = [];
    this.router = koaRouter(options);
    this.list = [];

    this.contact = options.contact || {};

    if (config.debug || options.force) {
      let getInfo = () => {
        return {
          urls: self.urls,
          dom_id: self.dom_id,
          validatorUrl: self.validatorUrl,
        };
      };
      this.router.get(`/${this.url}.json`, function* () {
        this.body = JSON.stringify(getInfo(), null, 4);
      });
      debuger(`SwaggerConfig register:/${this.url}.json`);
      this.router.get(`/${this.url}.yaml`, function* () {
        this.body = yaml.stringify(getInfo());
      });
      debuger(`SwaggerConfig register:/${this.url}.yaml`);
      this.list.push(this.router);
    }
  }
  addRouters(...routers) {
    routers.forEach((router) => {
      this.list.push(router);
      if (!router.setParent) return;
      router.setParent(this);
      this.urls.push({
        url: `${router.url}.yaml`,
        name: router.name,
      });
    });
  }
  routes() {
    return this.list;
  }
}

