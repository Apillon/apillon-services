import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  AuthenticationErrorCode,
} from '../../../../../../config/types';
import { ModelBase } from '../../../../../base-models/base';
import { JSONParser } from '../../../../../parsers';

export class VerifyCredentialDto extends ModelBase {
  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.SPORRAN_REQUEST_MESSAGE_NOT_PRESENT,
      },
    ],
  })
  public message: any;

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
  public encryptionKeyUri: string;

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
  public sessionId: string;
}
