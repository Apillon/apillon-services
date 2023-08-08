import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import {
  LogType,
  MongoCollections,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  ValidatorErrorCode,
} from '../../../../config/types';
import { enumInclusionValidator } from '../../../validators';
import { BaseLogsQueryFilter } from './base-logs-query-filter.dto';

export class LogsQueryFilter extends BaseLogsQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(MongoCollections, true),
        code: ValidatorErrorCode.COLLECTION_NAME_NOT_VALID,
      },
    ],
  })
  public collectionName: MongoCollections;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser(), array: true },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public logTypes: LogType[];

  @prop({
    parser: { resolver: stringParser(), array: true },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public services: ServiceName[];
}
