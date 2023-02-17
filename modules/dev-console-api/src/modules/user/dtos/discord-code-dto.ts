import {
  ModelBase,
  PopulateFrom,
  presenceValidator,
  prop,
  ValidatorErrorCode,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';

export class DiscordCodeDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEFAULT_VALIDATOR_ERROR_CODE,
      },
    ],
  })
  public code: string;
}
