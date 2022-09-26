// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { Model } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';

import { PopulateFrom } from 'at-lib';
import { ValidatorErrorCode } from '../../../config/types';

export class InstructionQueryFilter extends Model<any> {
  // Probably needed in the future for api docs
  // @ApiProperty({ required: true })
  @prop({
    parser: { resolver: stringParser() },
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
