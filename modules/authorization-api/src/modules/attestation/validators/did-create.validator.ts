import { ModelBase } from '@apillon/lib';

/**
 * Validate did create payload
 * @returns boolean
 */
export function didCreatePayloadValidator() {
  return async function (this: ModelBase, payload: any): Promise<boolean> {
    // I don't like this style, but linter is giving me shit
    if (payload.message === undefined) {
      return false;
    } else if (payload.nonce === undefined) {
      return false;
    } else {
      return true;
    }
  };
}

/**
 * Validate did create sender key
 * @returns boolean
 */
export function didCreateSenderValidator() {
  return async function (this: ModelBase, senderKey: string): Promise<boolean> {
    // This is better, no?
    if (typeof senderKey != 'string') return false;
    return true;
  };
}
