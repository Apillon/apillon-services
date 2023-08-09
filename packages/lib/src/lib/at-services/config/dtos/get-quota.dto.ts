// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  QuotaCode,
  QuotaType,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { enumInclusionValidator } from '../../../validators';

export class GetQuotaDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.QUOTA_ID_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(QuotaCode, true),
        code: ValidatorErrorCode.QUOTA_CODE_NOT_VALID,
      },
    ],
  })
  public quota_id: QuotaCode;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public object_uuid: string;

  /**
   * Used when querying for multiple quotas to filter by type
   * @type {?QuotaType[]}
   */
  @prop({
    parser: { resolver: integerParser(), array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    defaultValue: null,
  })
  public types?: QuotaType[];
}
