import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';

export class CreateOasisSignatureDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CREATE_OASIS_SIGNATURE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public data: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CREATE_OASIS_SIGNATURE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public integration_uuid: string;

  /**
   * The origin of the request, based on Origin, Referred or Host header
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public origin: string;

  /**
   * The referrer domain of the request, in case request comes from passkey gateway domain
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public referrerDomain?: string;
}
