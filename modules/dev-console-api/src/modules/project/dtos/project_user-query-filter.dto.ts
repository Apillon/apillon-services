// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { ModelBase } from 'at-lib/dist/lib/base-models/base';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';

export class ProjectUserFilter extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;
}
