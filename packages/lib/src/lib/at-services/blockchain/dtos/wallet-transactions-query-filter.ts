import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';

export class WalletTransactionsQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public status: number;
}
