// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';
import { stringParser } from '@rawmodel/parsers';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
import { PopulateFrom } from '@apillon/lib';

export class InstructionQueryFilter extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public forRoute: string;
}
