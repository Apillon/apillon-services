import { stringParser } from '@rawmodel/parsers';
import { prop } from '../../../base-models/base';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '../../../validators';
import { RpcApiKeyBaseDto } from './rpc-api-key-base.dto';
export class CreateRpcApiKeyDto extends RpcApiKeyBaseDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.RPC_API_KEY_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public projectUuid: string;
}
