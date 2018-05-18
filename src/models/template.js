const { Model, Schema } = require('../helps/model');
const { formatData } = require('../helps/tools');
// const { executor } = require('../helps/model');

const schema = new Schema({
  primary: 'id',
  create_time: true,
  update_time: true,
  soft_delete: true,
  auto_increment: true,
  fields: ['id', 'username', 'password', 'role_id', 'status'],
  default: {
    role_id: 0,
    status: 1,
  },
});

export const model = new Model('user', schema);

/**
 * 查找
 * @param id
 * @returns {*}
 */
export function get(id) {
  return model.findByKey(id);
}

/**
 * 查找列表
 * @param ids
 * @returns {*}
 */
export function getIds(ids) {
  return model.findByQuery({
    where: [
      ['id', 'in', ids],
    ],
  });
}

/**
 * 创建
 * @param data
 * @returns {*}
 */
export function add(data) {
  return model.insert(formatData(schema.baseFields(), data));
}

/**
 * 更新
 * @param id
 * @param data
 * @returns {*}
 */
export function put(id, data) {
  return model.updateByKey(id, formatData(schema.baseFields(), data));
}

/**
 * 删除
 * @param id
 * @returns {*}
 */
export function del(id) {
  return model.deleteByKey(id);
}

/**
 * 列表分页
 * @param page
 * @param number
 * @returns {*}
 */
export function search(where, page = 1, number = 50, order = 'id', direction = 'desc') {
  return model.findListAndCount(where, page, number, `\`${order}\` ${direction}`);
}

export function list(page, number, order, direction) {
  return search([], page, number, order, direction);
}
