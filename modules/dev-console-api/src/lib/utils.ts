export function isPlainObject(testVar: any): boolean {
  if (
    testVar === null ||
    testVar === undefined ||
    typeof testVar !== 'object' ||
    Array.isArray(testVar) ||
    typeof testVar?.getMonth === 'function'
  ) {
    return false;
  }
  return true;
}
