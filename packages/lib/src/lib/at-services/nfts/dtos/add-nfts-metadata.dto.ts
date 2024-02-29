import { prop } from '@rawmodel/core';
import { arrayParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  ethAddressValidator,
  numberSizeValidator,
  presenceValidator,
} from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class AddNftsMetadataDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public collection_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.ADD_NFT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public imagesSession: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.ADD_NFT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public metadataSession: string;
}
