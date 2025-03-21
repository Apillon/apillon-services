import { integerParser, stringParser } from '@rawmodel/parsers';
import { ModelBase, ModelBaseType, prop } from '../../../base-models/base';
import {
  BadRequestErrorCode,
  NftWebsiteType,
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '@rawmodel/validators';
import { enumInclusionValidator } from '../../../validators';

export type NftWebsiteDeployDtoType = ModelBaseType<NftWebsiteDeployDto>;

export class NftWebsiteDeployDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public websiteUuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(NftWebsiteType, false),
        code: BadRequestErrorCode.INVALID_NFT_WEBSITE_TYPE,
      },
    ],
  })
  public type: NftWebsiteType;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  apiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  apiSecret: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  contractAddress: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  chainId: number;
}
