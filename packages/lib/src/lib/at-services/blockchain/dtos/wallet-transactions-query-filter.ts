import { prop } from '@rawmodel/core';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';

export class WalletTransactionsQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public status: number = undefined;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public action: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public tsFrom: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public tsTo: Date;
}
