import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
// import { SubstrateChainPrefix } from '../../substrate/types';
// import { substrateAddressValidator } from '../../substrate/validators/address-validator';

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
      // {
      //   resolver: substrateAddressValidator(SubstrateChainPrefix.PHALA),
      //   code: ValidatorErrorCode.COMPUTING_ACCOUNT_ADDRESS_NOT_VALID,
      // },
    ],
  })
  public accountAddress: string;
}
