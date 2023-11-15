import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { numberSizeValidator } from '../../../validators';
import { substrateAddressValidator } from '../validators/substrate-address-validator';
import { ChainPrefix } from '../../substrate/constants/chain-prefix';

export class DepositToClusterDto extends ModelBase {
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
        resolver: substrateAddressValidator(ChainPrefix.PHALA),
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
