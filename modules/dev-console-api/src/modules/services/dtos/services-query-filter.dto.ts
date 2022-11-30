// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';
import { BaseQueryFilter, PopulateFrom } from '@apillon/lib';

export class ServiceQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public serviceType_id: number;
}