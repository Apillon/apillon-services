import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  AuthenticationErrorCode,
} from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class VerifySessionDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.AUTH_SESSION_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}
