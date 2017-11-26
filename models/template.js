var { Model, Schema } = require("../helps/model");
var { executor } = require('../helps/model');

let schema = new Schema({
  primary: 'id',
  create_time: true,
  update_time: true,
  auto_increment: true,
  fields: ['id', 'open_id', 'nick_name', 'avatar', 'message', 'money', 'session_key'],
  default: {
    money: 0,
    message: 1
  }
});

var model = new Model('user', schema);
/**
 * 查找账号
 * @param open_id
 * @returns {*}
 */
model.getByOpen = function (open_id) {
  let where = [];
  where.push(["open_id", "=", open_id]);
  return this.one({
    where: where
  }).then((result) => {
    if (result) return result;
    return this.insert({
      open_id: open_id,
      nick_name: "",
      avatar: "",
      session_key: ""
    });
  });
};
/**
 * 查找用户列表
 * @param identity
 * @param platform
 * @returns {*}
 */
model.getIds = function (ids) {
  return this.findByQuery({
    where: [
      ['id', 'in', ids]
    ]
  });
};
/**
 * 打赏排行榜
 * @param number
 * @returns {*}
 */
model.rank = function (number) {
  return this.find(null, number, "money desc");
};
/**
 * 充值操作
 * @param user_id
 * @param money
 * @returns {*}
 */
model.recharge = function (user_id, money) {
  return this.updateByKey(user_id, {
    money: ["+=", money]
  });
};
/**
 * 消费操作
 * @param user_id
 * @param money
 * @returns {*}
 */
model.consume = function (user_id, money) {
  return this.updateByKey(user_id, {
    money: ["-=", money]
  });
};
module.exports = model;
