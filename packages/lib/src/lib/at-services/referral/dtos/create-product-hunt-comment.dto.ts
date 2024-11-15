import { stringParser } from '@rawmodel/parsers';
import { ModelBase, prop } from '../../../base-models/base';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '@rawmodel/validators';

export class CreateProductHuntCommentDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PRODUCT_HUNT_COMMENT_USERNAME_NOT_PRESENT,
      },
    ],
  })
  public username: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PRODUCT_HUNT_COMMENT_URL_NOT_PRESENT,
      },
    ],
  })
  public url: string;
}
