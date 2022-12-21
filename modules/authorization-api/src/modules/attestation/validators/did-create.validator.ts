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
    return did_create_op.payload.message === undefined ||
      did_create_op.payload.nonce === undefined ||
      did_create_op.senderPubkey === undefined
      ? false
      : true;
  };
}

/**
 * Validate did uri -> did:kilt:uri
 * @returns boolean
 */
export function didUriValidator() {
  return async function (this: ModelBase, didUri: any): Promise<boolean> {
    return didUri.startswith('did:kilt:') ? true : false;
  };
}
