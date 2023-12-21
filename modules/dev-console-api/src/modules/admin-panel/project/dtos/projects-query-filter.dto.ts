import { BaseQueryFilter, PopulateFrom, SerializeFor } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';

export class ProjectsQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public subscriptionPackageId: number;
}
