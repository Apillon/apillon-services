import {
  BaseQueryFilter,
  PopulateFrom,
  enumInclusionValidator,
  prop,
} from '@apillon/lib';
import { integerParser } from '@rawmodel/parsers';
import { BadRequestErrorCode, ServiceStatusType } from '../../../config/types';

export class ServiceStatusQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(ServiceStatusType, true),
        code: BadRequestErrorCode.INVALID_SERVICE_STATUS_TYPE,
      },
    ],
  })
  public type?: ServiceStatusType;
}
