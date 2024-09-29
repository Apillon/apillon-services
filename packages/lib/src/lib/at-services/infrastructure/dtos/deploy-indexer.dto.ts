import { prop } from '@rawmodel/core';
import { RpcUrlBaseDto } from './rpc-url-base.dto';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '@rawmodel/validators';
import { ModelBase } from '../../../base-models/base';
export class DeployIndexerDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEPLOY_INDEXER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public indexer_uuid: string;
}
