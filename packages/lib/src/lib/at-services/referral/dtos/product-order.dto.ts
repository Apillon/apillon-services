import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { JSONParser } from '../../../parsers';

export class ProductOrderDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PRODUCT_ID_NOT_PRESENT,
      },
    ],
  })
  public id: number;

  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public info: any;
}
