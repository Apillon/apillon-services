import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { presenceValidator } from '../../../validators';

export class EncryptContentDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public contract_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public content: string;
}
