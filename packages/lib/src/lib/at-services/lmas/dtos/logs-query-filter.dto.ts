import { prop } from '@rawmodel/core';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { dateParser, stringParser } from '@rawmodel/parsers';
import {
  LogType,
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { enumInclusionValidator } from '../../../validators';

export class LogsQueryFilter extends BaseQueryFilter {
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
  })
  public user_uuid: string;

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
  })
  public service: string;

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
