import { prop } from '@rawmodel/core';
import { booleanParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';

export class ContractAbiQueryDTO extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public contract_uuid: string;

  /**
   * Determines if endpoint should return human-readable ABI (default, false)
   * or ABI in Solidity JSON format (true).
   */
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public solidityJson: boolean;
}

export class ApillonApiContractAbiQueryDTO extends ContractAbiQueryDTO {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public project_uuid: string;
}
