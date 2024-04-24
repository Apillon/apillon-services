import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { ethAddressValidator, presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { UserWalletAuthDto } from '../../ams/dtos/user-wallet-auth.dto';

export class ClaimTokensDto extends UserWalletAuthDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public fingerprint: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public ip_address: string;
}
