import { ModelBase, prop } from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, SerializeFor, ValidatorErrorCode } from '@apillon/lib';
import { numberSizeValidator } from '@apillon/lib/';
import {
  substrateAddressValidator,
  SubstrateChainPrefix,
} from '../../../../substrate';

export class DepositToClusterDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_FIELD_NOT_PRESENT,
      },
    ],
  })
  public clusterId: string;

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
        resolver: substrateAddressValidator(SubstrateChainPrefix.PHALA),
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
