import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import {
  PopulateFrom,
  ProductCategory,
  ProductService,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { enumInclusionValidator } from '../../../validators';

export class PricelistQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: enumInclusionValidator(ProductService, true),
        code: ValidatorErrorCode.PRODUCT_SERVICE_NOT_VALID,
      },
    ],
  })
  public service: ProductService;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: enumInclusionValidator(ProductCategory, true),
        code: ValidatorErrorCode.PRODUCT_CATEGORY_NOT_VALID,
      },
    ],
  })
  public category: ProductCategory;
}
