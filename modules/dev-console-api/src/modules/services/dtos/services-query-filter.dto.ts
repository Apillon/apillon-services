// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';
import { ModelBase } from 'at-lib/dist/lib/base-models/base';

export class ServiceQueryFilter extends ModelBase {
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
    parser: { resolver: integerParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SERVICE_TYPE_NOT_PRESENT,
      },
    ],
  })
  public serviceType_id: number;
}
