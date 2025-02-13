import { stringParser } from '@rawmodel/parsers';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';

export class DeploymentBuildQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public websiteUuid: string;
}
