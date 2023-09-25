import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import {
  LogType,
  PopulateFrom,
  SerializeFor,
  ServiceName,
} from '../../../../config/types';
import { BaseLogsQueryFilter } from './base-logs-query-filter.dto';
import { stringArrayParser } from '../../../parsers';

export class LogsQueryFilter extends BaseLogsQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringArrayParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public logTypes: LogType[];

  @prop({
    parser: { resolver: stringArrayParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public services: ServiceName[];
}
