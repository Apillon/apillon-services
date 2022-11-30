import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Instruction } from './models/instruction.model';
import { CodeException, ValidationException } from '@apillon/lib';

@Injectable()
export class InstructionService {
  async getInstruction(
    context: DevConsoleApiContext,
    instruction_enum: string,
  ) {
    return await new Instruction({}, context).getInstructionByEnum(
      context,
      instruction_enum,
    );
  }

  async createInstruction(context: DevConsoleApiContext, body: any) {
    const instruction = await new Instruction({}, context).getInstructionByEnum(
      context,
      body.instructionEnum,
    );
    if (instruction.exists()) {
      throw new CodeException({
        code: ValidatorErrorCode.INSTRUCTION_ENUM_EXISTS,
        status: HttpStatus.CONFLICT,
        errorCodes: ValidatorErrorCode,
      });
    }

    return await body.insert();
  }

  async updateInstruction(
    context: DevConsoleApiContext,
    instruction_enum: string,
    data: any,
  ) {
    const instruction = await new Instruction({}, context).getInstructionByEnum(
      context,
      instruction_enum,
    );
    if (!instruction.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.INSTRUCTION_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    instruction.populate(data);

    try {
      await instruction.validate();
    } catch (err) {
      await instruction.handle(err);
    }

    if (!instruction.isValid())
      throw new ValidationException(instruction, ValidatorErrorCode);

    await instruction.update();
    return instruction;
  }

  async deleteInstruction(context: DevConsoleApiContext, id: number) {
    const instruction = await new Instruction({}, context).populateById(id);
    if (!instruction.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.INSTRUCTION_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    await instruction.delete();
    return instruction;
  }
}
