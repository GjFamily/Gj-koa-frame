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
function generate(no, type, show, log) {
  return (info, detail) => {
    const err = new Error(show && (info instanceof String) ? info : type);
    err.no = no;
    if (show) {
      if (info instanceof String) {
        err.info = detail;
      } else {
        err.info = info;
      }
    }
    err.detail = detail;
    err.log = log;
    return err;
  };
}
module.exports.AuthException = generate(401, 'AUTH_ERROR', true, false);
module.exports.ValidException = generate(402, 'VALID_ERROR', true, false);
module.exports.EmptyException = generate(403, 'EMPTY_ERROR', true, false);
module.exports.SystemException = generate(500, 'SYSTEM_ERROR', false, true);
