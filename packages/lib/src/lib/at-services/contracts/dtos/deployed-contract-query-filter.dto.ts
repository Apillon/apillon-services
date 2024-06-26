import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ChainType, PopulateFrom } from '../../../../config/types';
import { BaseProjectQueryFilter } from '../../../base-models/base-project-query-filter.model';

export class DeployedContractsQueryFilter extends BaseProjectQueryFilter {
  // TODO: remove chainType from table since it's stored inside contractTable?
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public chainType: ChainType;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public contractStatus: number;
}

export class ApillonApiContractsQueryFilter extends DeployedContractsQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public override project_uuid: string;
}
