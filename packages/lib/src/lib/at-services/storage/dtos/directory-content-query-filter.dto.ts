// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { booleanParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';

export class DirectoryContentQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.BUCKET_UUID_NOT_PRESENT,
      },
    ],
  })
  public bucket_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public directory_uuid: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public markedForDeletion: boolean;
}

export class ApillonApiDirectoryContentQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public directoryUuid: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public markedForDeletion: boolean;
}
