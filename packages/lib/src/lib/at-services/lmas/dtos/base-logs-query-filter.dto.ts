import { prop } from '@rawmodel/core';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { dateParser, stringParser } from '@rawmodel/parsers';
import {
  MongoCollections,
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { enumInclusionValidator } from '../../../validators';

export class BaseLogsQueryFilter extends BaseQueryFilter {
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
