// import { ApiProperty } from '@babel/core';
import { ModelBase, PopulateFrom } from '@apillon/lib';
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
