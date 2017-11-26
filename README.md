# Gj-koa-frame

## 架构层级
* 通信层：
    * route： http访问
    * message：websocket访问
    * agent：本地计划任务
* 业务层：controller
* 模型层：model

## 目录说明：
* tools：第三方服务组件
    * mysql：支持yield调用，支持异步事务
    * redis：支持yield调用
    * logger：日志打印
* helps：工具集
    * auth：middle验证工具，支持session，token方式
    * controller：参数适配器
    * api：http调用工具
    * message：websocket的集成，提供message通信层
    * model：实现模型层，支持事件绑定，字段注入，sql组装器
    * cache：给予redis的cache访问接口，简化异步缓存
    * agent：基本计划任务调度，支持agent通信层
* lib：扩展类库
    * base64：base64处理工具

## 