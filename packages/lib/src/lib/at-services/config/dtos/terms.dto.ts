// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import {
  booleanParser,
  dateParser,
  integerParser,
  stringParser,
} from '@rawmodel/parsers';

import { PopulateFrom } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class TermsDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
  })
  public id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
  })
  public title: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
  })
  public type: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
  })
  public text: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
  })
  public url: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
  })
  public validFrom: Date;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
  })
  public isRequired: boolean;
}
