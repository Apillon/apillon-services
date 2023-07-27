import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  ErrorCode,
  PopulateFrom,
  SqlModelStatus,
} from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { enumInclusionValidator } from '../../../validators';

export class UpdateWalletDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  // must be string (big number not supported)
  public minBalance?: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public token?: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public decimals?: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(SqlModelStatus, true),
        code: ErrorCode.INVALID_STATUS,
      },
    ],
  })
  public status?: SqlModelStatus;
}
