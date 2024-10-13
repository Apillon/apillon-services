// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';

import {
  PopulateFrom,
  ProductCode,
  ServiceName,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { presenceValidator } from '@rawmodel/validators';

export class SpendCreditDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public product_id: ProductCode;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public referenceTable: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public referenceId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public location: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public service: ServiceName;

  /**
   * Amount is normally retrieved from product, but can be overriden with this field.
   * This is useful for product with variable price.
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public amount?: number;
}
