import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';

export class UpdateEWIntegrationDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CREATE_EW_INTEGRATION_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public title: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        // Must be a comma separated string
        resolver: (value: string) => {
          try {
            return !value || Array.isArray(value.split(','));
          } catch {
            return false;
          }
        },
        code: ValidatorErrorCode.CREATE_EW_INTEGRATION_INVALID_WHITELISTED_DOMAINS,
      },
    ],
  })
  public whitelistedDomains: string;
}

export class CreateEWIntegrationDto extends UpdateEWIntegrationDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CREATE_EW_INTEGRATION_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;
}
