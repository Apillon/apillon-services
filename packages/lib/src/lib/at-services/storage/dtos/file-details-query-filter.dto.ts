// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { BadRequestErrorCode, PopulateFrom } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class FileDetailsQueryFilter extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public bucket_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: BadRequestErrorCode.INVALID_QUERY_PARAMETERS,
      },
    ],
  })
  public uuid: string;
}
