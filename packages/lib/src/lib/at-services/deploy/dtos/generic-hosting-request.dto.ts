import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../../config/types';

export class GenericHostingRequestDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1 }),
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
  })
  public hosting_uuid: string;
}
