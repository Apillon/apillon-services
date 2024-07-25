import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '@apillon/lib';
import { ModelBase } from '@apillon/lib';
import {
  substrateAddressValidator,
  SubstrateChainPrefix,
} from '../../../../substrate';

export class TransferOwnershipDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public contract_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
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
}
