import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { ethAddressValidator, presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class TransferCollectionDTOBase extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_PRESENT,
      },
      {
        resolver: ethAddressValidator(),
        code: ValidatorErrorCode.NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_VALID,
      },
    ],
  })
  public address: string;
}

export class TransferCollectionDTO extends TransferCollectionDTOBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public collection_uuid: string;
}

export class ApillonApiTransferCollectionDTO extends TransferCollectionDTOBase {}
