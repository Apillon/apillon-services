import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { ApiName, PopulateFrom, SerializeFor } from '../../../../config/types';
import { BaseLogsQueryFilter } from './base-logs-query-filter.dto';

export class RequestLogsQueryFilter extends BaseLogsQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public apiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public apiName: ApiName;
}
