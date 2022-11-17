import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Instruction } from './models/instruction.model';
import { CodeException, SerializeFor, ValidationException } from '@apillon/lib';

@Injectable()
export class InstructionService {
  async getInstructions(context: DevConsoleApiContext, forRoute: string) {
    return await new Instruction({}, context).getInstructions(
      context,
      forRoute,
    );
  }

  async getInstruction(context: DevConsoleApiContext, instructionEnum: string) {
    const instruction = await new Instruction({}, context).getInstructionByEnum(
      context,
      instructionEnum,
    );

    if (!instruction.exists()) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ValidatorErrorCode.INSTRUCTION_ENUM_EXISTS,
        errorCodes: ValidatorErrorCode,
      });
    }

    return instruction.serialize(SerializeFor.PROFILE);
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
    instructionEnum: string,
    data: any,
  ) {
    const instruction = await new Instruction({}, context).getInstructionByEnum(
      context,
      instructionEnum,
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
