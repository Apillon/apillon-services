import { prop } from '@rawmodel/core';
import { floatParser, integerParser } from '@rawmodel/parsers';
import { ModelBase, PopulateFrom, ValidatorErrorCode } from '@apillon/lib';
import { numberSizeValidator } from '@rawmodel/validators';

export class RefillWalletDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public walletId: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public multisigWalletId: number;

  @prop({
    parser: { resolver: floatParser() },
    validators: [
      {
        resolver: numberSizeValidator({ minOrEqual: 0.001 }),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
    populatable: [PopulateFrom.ADMIN],
  })
  public amountIn: number;
}
