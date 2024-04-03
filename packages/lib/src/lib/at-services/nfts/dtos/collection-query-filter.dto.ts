import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { BaseProjectQueryFilter } from '../../../base-models/base-project-query-filter.model';

export class NFTCollectionQueryFilter extends BaseProjectQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public collectionStatus: number;
}

export class ApillonApiNFTCollectionQueryFilter extends NFTCollectionQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public override project_uuid: string;
}
