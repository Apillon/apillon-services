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
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(LogType, true),
        code: ValidatorErrorCode.INVALID_LOG_TYPE,
      },
    ],
  })
  public logType: LogType;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(ServiceName, true),
        code: ValidatorErrorCode.INVALID_SERVICE_NAME,
      },
    ],
  })
  public service: ServiceName;
}
