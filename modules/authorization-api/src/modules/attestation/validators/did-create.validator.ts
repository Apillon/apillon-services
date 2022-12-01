import { ModelBase } from '@apillon/lib';

/**
 * Validate did create payload
 * @returns boolean
 */
export function didCreatePayloadValidator() {
  return async function (this: ModelBase, payload: any): Promise<boolean> {
    // Linter is complaining here, but .. I like this
    if (payload.message === undefined) return false;
    if (payload.nonce === undefined) return false;
    return true;
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
