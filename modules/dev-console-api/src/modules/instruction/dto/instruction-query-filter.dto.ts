// import { ApiProperty } from '@babel/core';
import { PopulateFrom } from '@apillon/lib';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';

export class InstructionQueryFilter extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public forRoute: string;
}
