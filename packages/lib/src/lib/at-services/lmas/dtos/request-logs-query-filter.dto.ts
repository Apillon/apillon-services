import { prop } from '@rawmodel/core';
import { booleanParser, stringParser } from '@rawmodel/parsers';
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

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public body: string;

  /**
   * Display also requests made by the system (e.g. workers, scheduled jobs etc.)
   */
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
    defaultValue: false,
  })
  public showSystemRequests: boolean;
}
