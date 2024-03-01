// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';

import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class ConfigureCreditDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONFIGURE_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public threshold: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONFIGURE_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public alertIfBelowThreshold: string;
}
