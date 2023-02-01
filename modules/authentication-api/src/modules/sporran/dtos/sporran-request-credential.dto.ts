import { ModelBase, PopulateFrom } from '@apillon/lib';
import { DidUri } from '@kiltprotocol/types';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AuthenticationErrorCode } from '../../../config/types';

export class SporranRequestCredentialDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT,
      },
    ],
  })
  // This is actually a jwt token, but we call it sessionId
  public encryptionKeyUri: DidUri;
}
