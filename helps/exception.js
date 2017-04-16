/**
 * Created by gaojie on 17-3-6.
 */

/**
 * 格式化异常逻辑
 * @param no
 * @param type
 * @param show
 * @param log
 * @returns {Function}
 */
function generate(no, type, show, log){
  return function(message, detail){
    var err = new Error(show?message:type);
    err.no = no;
    if(show) {
      err.type = type;
    }else{
      err.info = message;
    }
    err.detail = detail;
    err.log = log;
    return err;
  }
}
module.exports.AuthException = generate(101, "验证错误", true, false);
module.exports.ValidException = generate(102, "数据验证错误", true, false);
module.exports.EmptyException = generate(103, "数据为空", true, false);
module.exports.SystemException = generate(104, "系统错误", false, true);
