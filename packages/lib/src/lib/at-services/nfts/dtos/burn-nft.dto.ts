import { integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';
import { numberSizeValidator, presenceValidator } from '../../../validators';

export class BurnNftDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public collection_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_BURN_TOKEN_ID_NOT_PRESENT,
      },
      {
        resolver: numberSizeValidator({ minOrEqual: 1 }),
        code: ValidatorErrorCode.NFT_BURN_TOKEN_ID_NOT_VALID,
      },
    ],
  })
  public tokenId: number;
}
