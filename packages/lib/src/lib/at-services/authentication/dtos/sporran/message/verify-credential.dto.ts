import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  ValidatorErrorCode,
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
        code: ValidatorErrorCode.SPORRAN_REQUEST_MESSAGE_NOT_PRESENT,
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
        code: ValidatorErrorCode.SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT,
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
        code: ValidatorErrorCode.SPORRAN_SESSIONID_NOT_PRESENT,
      },
    ],
  })
  public sessionId: string;

  /**
   * Sent as header, added to body in AuthGuard
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public token: string;
}
