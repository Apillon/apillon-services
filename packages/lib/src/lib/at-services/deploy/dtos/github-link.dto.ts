import { stringParser } from '@rawmodel/parsers';
import { ModelBase, ModelBaseType, prop } from '../../../base-models/base';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '@rawmodel/validators';

export type GithubLinkDtoType = ModelBaseType<GithubLinkDto>;
export class GithubLinkDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public code: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;
}
