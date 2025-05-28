import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { DeploySecretDto } from './deploy-secret.dto';
import { arrayPresenceValidator } from '../../../validators';

/**
 * Represents the data transfer object for Backend redeploy request.
 */
export class RedeployInstanceDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public backend_uuid: string;

  @prop({
    parser: { array: true, resolver: DeploySecretDto },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: arrayPresenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public secrets: DeploySecretDto[];
}
