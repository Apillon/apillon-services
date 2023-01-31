import { ModelBase, PopulateFrom, presenceValidator, prop } from '@apillon/lib';
import { AuthenticationErrorCode } from '../../../config/types';
import { stringParser } from '@rawmodel/parsers';

export class SporranSessionVerifyDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.SPORRAN_SESSIONID_NOT_PRESENT,
      },
    ],
  })
  // This is actually a jwt token, but we call it sessionId
  public sessionId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT,
      },
    ],
  })
  public encryptedChallenge: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT,
      },
    ],
  })
  public encryptionKeyId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.SPORRAN_NONCE_NOT_PRESENT,
      },
    ],
  })
  public nonce: string;
}
