export function Required(value) {
  if (!value || value === undefined) return false;
  return true;
}

export function Mobile(value) {
  const reg = /^\d{6,15}$/;
  return reg.test(value);
}

export function Email(value) {
  const reg = /^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,5}$/;
  return reg.test(value);
}

export function Integer(value) {
  const reg = /^\d+$/;
  return reg.test(value);
}

export function Page(page, number) {
  if (!Integer(page) || !Integer(number)) return false;
  return true;
}
