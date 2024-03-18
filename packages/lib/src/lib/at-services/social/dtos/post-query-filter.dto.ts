// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { BaseProjectQueryFilter } from '../../../base-models/base-project-query-filter.model';

export class SocialPostQueryFilter extends BaseProjectQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public hubUuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public space_uuid: string;
}
