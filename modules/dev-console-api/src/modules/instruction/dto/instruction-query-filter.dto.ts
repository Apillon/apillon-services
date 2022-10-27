// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';
import { stringParser } from '@rawmodel/parsers';
import { ModelBase } from 'at-lib/dist/lib/base-models/base';
import { PopulateFrom } from 'at-lib';

export class InstructionQueryFilter extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INSTRUCTION_ENUM_NOT_PRESENT,
      },
    ],
  })
  public instructionEnum: string;

  // NOTE: Currently UNUSED
  // @ApiProperty({ required: false })
  //   @prop({
  //     parser: { resolver: stringParser() },
  //     validators: [
  //       {
  //         resolver: presenceValidator(),
  //         code: ValidatorErrorCode.INSTRUCTION_FORROUTE_NOT_PRESENT,
  //       },
  //     ],
  //   })
  //   public forRoute: string;
  // }
}
