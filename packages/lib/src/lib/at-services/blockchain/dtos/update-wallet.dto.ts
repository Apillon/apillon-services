import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class UpdateWalletDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  // must be string (big number not supported)
  public minBalance: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public token: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN],
  })
  public decimals: number;
}
