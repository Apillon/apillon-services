// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { Model } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';

import { PopulateFrom } from 'at-lib';
import { ValidatorErrorCode } from '../../../config/types';

export class ServiceQueryFilter extends Model<any> {
  // Probably needed in the future for api docs
  // @ApiProperty({ required: true })
  @prop({
    parser: { resolver: integerParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;

  // @ApiProperty({ required: false })
  @prop({
    parser: { resolver: stringParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SERVICE_TYPE_NOT_PRESENT,
      },
    ],
  })
  public type: string;
}
