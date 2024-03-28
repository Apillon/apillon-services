import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { BaseProjectQueryFilter } from '../../../base-models/base-project-query-filter.model';

export class BucketQueryFilter extends BaseProjectQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public bucketType: number;
}
