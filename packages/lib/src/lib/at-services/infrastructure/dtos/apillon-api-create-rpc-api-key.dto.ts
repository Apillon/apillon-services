import { integerParser, stringParser } from '@rawmodel/parsers';
import { prop } from '../../../base-models/base';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { RpcApiKeyBaseDto } from './rpc-api-key-base.dto';

export class ApillonApiCreateRpcApiKeyDto extends RpcApiKeyBaseDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.APILLON_API,
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.APILLON_API,
    ],
  })
  public user_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.APILLON_API,
    ],
  })
  public user_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.APILLON_API,
    ],
  })
  public email: string;
}
