import { ModelBase, PopulateFrom } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AuthorizationErrorCode } from '../../../config/types';

export class VerificationIdentityDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthorizationErrorCode.VERIFICATION_IDENTITY_NOT_PRESENT,
      },
    ],
  })
  public presentation: string;
}
