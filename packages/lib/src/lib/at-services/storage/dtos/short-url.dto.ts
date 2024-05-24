import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';
import { urlDomainValidator } from '../../../validators';
import { env } from '../../../../config/env';

export enum ShortUrlReferenceType {
  FILE,
  IPNS,
  BUCKET,
  WEBSITE,
}

export class ShortUrlDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.TARGET_URL_NOT_PRESENT,
      },
      {
        resolver: urlDomainValidator(env.SHORTENER_VALID_DOMAINS),
        code: ValidatorErrorCode.TARGET_URL_NOT_VALID,
      },
    ],
  })
  public targetUrl: string;
}
