// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  CacheKeyPrefix,
  ModelBase,
  PopulateFrom,
  ValidatorErrorCode,
  enumInclusionValidator,
} from '@apillon/lib';
import { UUID } from 'crypto';

export class RemoveCacheKeyDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(CacheKeyPrefix, false),
        code: ValidatorErrorCode.INVALID_CACHE_KEY,
      },
    ],
  })
  public cacheKey: CacheKeyPrefix;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public user_uuid: UUID;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public project_uuid: UUID;
}
