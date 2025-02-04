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
        code: ValidatorErrorCode.WEBSITE_UUID_NOT_PRESENT_IN_QUERY,
      },
    ],
  })
  public websiteUuid: string;
}
