import { prop } from '@rawmodel/core';
import { booleanParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';

export class ContractAbiQuery extends BaseQueryFilter {
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
