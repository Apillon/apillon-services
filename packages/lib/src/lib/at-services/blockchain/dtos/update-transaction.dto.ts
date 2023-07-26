import { prop } from '@rawmodel/core';
import { floatParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class UpdateTransactionDto extends ModelBase {
  @prop({
    parser: { resolver: floatParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public value: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN],
  })
  public description: string;
}
