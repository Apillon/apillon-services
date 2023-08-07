// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';

export class ApiKeyQueryFilterDto extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_UUID_QUERY_PARAM_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;
}
