// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { Model } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';

export class ProjectUserFilter extends Model<any> {
  @prop({
    parser: { resolver: integerParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_USER_ID_NOT_PRESENT,
      },
    ],
  })
  public user_id: number;
}
