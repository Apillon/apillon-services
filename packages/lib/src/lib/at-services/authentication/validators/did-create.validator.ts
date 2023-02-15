import { ModelBase } from '../../../base-models/base';
// NOTE:
// The following checks could be performed in a
// more elegant style, but we want to be explicit

/**
 * Validate did create payload
 * @returns boolean
 */
export function didCreateCreateOpValidator() {
  return async function (
    this: ModelBase,
    did_create_op: any,
  ): Promise<boolean> {
    return did_create_op?.payload?.message === undefined ||
      did_create_op?.payload?.nonce === undefined ||
      did_create_op?.senderPubKey === undefined
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
    return didUri == undefined || !didUri.startsWith('did:kilt:')
      ? false
      : true;
  };
}
