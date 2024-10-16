import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  PopulateFrom,
  SubstrateChain,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import {
  arrayLengthValidator,
  enumInclusionValidator,
} from '../../../validators';
import { Chain } from '../utils';
import { isArrayOfSubstrateChainAddresses } from '@apillon/blockchain-lib/substrate';

export class CreateMultisigWalletRequestDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public description: string;

  @prop({
    parser: { resolver: withUniqueListItems() },
    populatable: [PopulateFrom.ADMIN],
    validators: [
      {
        resolver: arrayLengthValidator(),
        code: ValidatorErrorCode.MULTISIG_WALLET_NEEDS_AT_LEAST_ONE_OTHER_SIGNER,
      },
      {
        resolver: isArrayOfSubstrateChainAddresses(),
        code: ValidatorErrorCode.AT_LEAST_ONE_OF_ADDRESSES_IS_INVALID,
      },
    ],
  })
  public otherSigners: string[];

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
    validators: [
      {
        resolver: validateThresholdAgainstOtherSigners(),
        code: ValidatorErrorCode.NOT_ENOUGH_SIGNERS_FOR_THRESHOLD,
      },
    ],
  })
  public threshold: number;

  // @prop({
  //   parser: { resolver: integerParser() },
  //   populatable: [PopulateFrom.ADMIN],
  //   validators: [
  //     {
  //       resolver: enumInclusionValidator(ChainType, false),
  //       code: ValidatorErrorCode.INVALID_CHAIN_TYPE,
  //     },
  //   ],
  // })
  // public chainType: ChainType;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(SubstrateChain, false),
        code: ValidatorErrorCode.INVALID_CHAIN,
      },
    ],
  })
  public chain: Chain;
}

function validateThresholdAgainstOtherSigners() {
  return function (this: ModelBase | any, threshold: number): boolean {
    return threshold > 0 && threshold <= this.otherSigners.length + 1;
  };
}

export function withUniqueListItems() {
  return (value: unknown) =>
    Array.isArray(value) ? [...new Set(value)] : value;
}
