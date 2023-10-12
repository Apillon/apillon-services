import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { numberSizeValidator } from '../../../validators';
import { decodeAddress, encodeAddress } from '@polkadot/keyring';
import { hexToU8a, isHex } from '@polkadot/util';

function phalaAddressValidator() {
  return function (this: any, address: string): boolean {
    try {
      //TODO: we need a better check for Phala address
      if (address.charAt(0) !== '4') {
        return false;
      }
      encodeAddress(
        isHex(address) ? hexToU8a(address) : decodeAddress(address),
      );
      return true;
    } catch (e: any) {
      return false;
    }
  };
}

export class DepositToContractClusterDtoBase extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public contract_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_ACCOUNT_ADDRESS_NOT_PRESENT,
      },
      {
        resolver: phalaAddressValidator(),
        code: ValidatorErrorCode.COMPUTING_ACCOUNT_ADDRESS_NOT_VALID,
      },
    ],
  })
  public accountAddress: string;

  @prop({
    // parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: numberSizeValidator({
          minOrEqual: 0.01,
        }),
        code: ValidatorErrorCode.COMPUTING_DEPOSIT_AMOUNT_NOT_VALID,
      },
    ],
  })
  public amount: number;
}

export class DepositToClusterDto extends DepositToContractClusterDtoBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;
}

export class ApillonApiDepositToClusterDto extends DepositToContractClusterDtoBase {}
