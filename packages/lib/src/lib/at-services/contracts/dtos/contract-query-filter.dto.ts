import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ChainType, PopulateFrom } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';

export class ContractsQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public chainType: ChainType;
}

export class ApillonApiContractsQueryFilterDTO extends ContractsQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public project_uuid: string;
}
