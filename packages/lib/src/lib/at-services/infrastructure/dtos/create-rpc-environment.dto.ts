import { integerParser, stringParser } from '@rawmodel/parsers';
import { prop } from '../../../base-models/base';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '../../../validators';
import { RpcEnvironmentBaseDto } from './rpc-environment-base.dto';
export class CreateRpcEnvironmentDto extends RpcEnvironmentBaseDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.RPC_ENVIRONMENT_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public projectUuid: string;
}
