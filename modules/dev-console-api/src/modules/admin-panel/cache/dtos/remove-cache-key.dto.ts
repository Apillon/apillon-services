// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
import {
  CacheKeyPrefix,
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
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public userId: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public project_uuid: UUID;
}
