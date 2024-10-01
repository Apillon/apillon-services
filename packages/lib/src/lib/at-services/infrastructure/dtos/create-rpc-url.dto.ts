import { prop } from '@rawmodel/core';
import { RpcUrlBaseDto } from './rpc-url-base.dto';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '@rawmodel/validators';
export class CreateRpcUrlDto extends RpcUrlBaseDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.RPC_URL_CHAIN_NAME_NOT_PRESENT,
      },
    ],
  })
  chainName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.RPC_URL_NETWORK_NOT_PRESENT,
      },
    ],
  })
  network: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.RPC_URL_API_KEY_ID_NOT_PRESENT,
      },
    ],
  })
  apiKeyId: number;
}
