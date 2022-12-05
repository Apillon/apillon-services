import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { prop } from '../../../base-models/base';
import { ApiKeyRoleBaseDto } from './api-key-role-base.dto';

export class ApiKeyRoleDto extends ApiKeyRoleBaseDto {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.API_KEY_ROLE_API_KEY_ID_NOT_PRESENT,
      },
    ],
  })
  public apiKey_id: number;
}
