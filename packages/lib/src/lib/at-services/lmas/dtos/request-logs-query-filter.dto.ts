import { prop } from '@rawmodel/core';
import { booleanParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { BaseLogsQueryFilter } from './base-logs-query-filter.dto';

export class RequestLogsQueryFilter extends BaseLogsQueryFilter {
  /**
   * If true, list logs from Apillon API. Otherwise, console logs are returned.
   */
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
    defaultValue: false,
  })
  public apiLogs: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public apiKey: string;
}
