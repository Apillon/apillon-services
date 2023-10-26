import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  DefaultApiKeyRole,
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';
import { enumInclusionValidator } from '../../../validators';

/**
 * DTO class with basic properties to assign role to ApiKey
 * directly used when creating new ApiKey, and extended when modifying roles of existing ApiKey
 */
export class ApiKeyRoleBaseDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.API_KEY_ROLE_ROLE_ID_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(DefaultApiKeyRole),
        code: ValidatorErrorCode.API_KEY_ROLE_ROLE_ID_NOT_VALID,
      },
    ],
  })
  public role_id: DefaultApiKeyRole;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.API_KEY_ROLE_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.API_KEY_ROLE_SERVICE_UUID_NOT_PRESENT,
      },
    ],
  })
  public service_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public serviceType_id: number;
}
