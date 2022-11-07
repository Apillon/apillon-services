// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class FileDetailsQueryFilter extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public file_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public cid: string;
}
