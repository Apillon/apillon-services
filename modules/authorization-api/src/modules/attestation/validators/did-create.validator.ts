import { ModelBase } from '@apillon/lib';

/**
 * Validate did create payload
 * @returns boolean
 */
export function didCreateCreateOpValidator() {
  return async function (
    this: ModelBase,
    did_create_op: any,
  ): Promise<boolean> {
    // Linter is complaining here, but .. I like this
    if (did_create_op.payload.message === undefined) return false;
    if (did_create_op.payload.nonce === undefined) return false;
    if (did_create_op.senderPubKey === undefined) return false;
    return true;
  };
}

/**
 * Validate did uri -> did:kilt:uri
 * @returns boolean
 */
export function didUriValidator() {
  return async function (this: ModelBase, didUri: any): Promise<boolean> {
    // Linter is complaining here, but .. I like this
    if (!didUri.includes('did:kilt:')) return false;
    return true;
  };
}
