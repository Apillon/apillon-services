import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

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
    validators: [],
  })
  public content: string;
}
