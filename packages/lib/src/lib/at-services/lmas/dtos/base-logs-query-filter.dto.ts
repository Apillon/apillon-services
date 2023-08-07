import { prop } from '@rawmodel/core';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { dateParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';

export class BaseLogsQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public user_uuid: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public dateFrom: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public dateTo: Date;
}
