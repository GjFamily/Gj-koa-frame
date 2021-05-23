import { BaseModel, Schema } from '../helps/model';

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
class UserModel extends BaseModel {
  list(page, number, order, direction) {
    return this.search([], page, number, order, direction);
  }
}
export default new UserModel('user', schema);
