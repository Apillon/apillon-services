import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { numberSizeValidator, presenceValidator } from '../../../validators';

function hexValidator(value: string) {
  return typeof value === 'string' && /^0x[0-9A-F]+$/i.test(value);
}

// TODO: TransmitMultiSigRequest wont be needed anymore
export class TransmitMultiSigRequest extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public signerWalletId: number;

  @prop({
    parser: { resolver: stringParser() },
    validators: [
      {
        resolver: hexValidator,
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
    populatable: [PopulateFrom.ADMIN],
  })
  public transactionHex: string;

  @prop({
    parser: { resolver: integerParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: numberSizeValidator({ minOrEqual: 2 }),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
    populatable: [PopulateFrom.ADMIN],
  })
  public threshold: number;

  @prop({
    // TODO: validate array of substrate addresses
    // validators: [
    //   {
    //     resolver: signersGreaterOrEqualThreshold(
    //       SubstrateChainPrefix.HYDRATION,
    //     ),
    //     code: ValidatorErrorCode.DATA_NOT_VALID,
    //   },
    // ],
    populatable: [PopulateFrom.ADMIN],
  })
  public signers: string[];

  @prop({
    // TODO: better validator
    // TODO: add back after testing
    // validators: [
    //   {
    //     resolver: presenceValidator(),
    //     code: ValidatorErrorCode.DATA_NOT_PRESENT,
    //   },
    // ],
    populatable: [PopulateFrom.ADMIN],
  })
  public timePoint: { height: number; index: number };
}
