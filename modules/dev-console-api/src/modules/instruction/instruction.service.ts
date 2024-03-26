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

  async getInstruction(context: DevConsoleApiContext, id: number) {
    const instruction = await new Instruction({}, context).populateById(id);

    if (!instruction.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ValidatorErrorCode.INSTRUCTION_ENUM_EXISTS,
        errorCodes: ValidatorErrorCode,
      });
    }

    return instruction.serialize(SerializeFor.PROFILE);
  }

  async createInstruction(context: DevConsoleApiContext, body: Instruction) {
    await body.insert();
    return body.serialize(SerializeFor.PROFILE);
  }

  async updateInstruction(
    context: DevConsoleApiContext,
    id: number,
    data: any,
  ) {
    const instruction = await new Instruction({}, context).populateById(id);
    if (!instruction.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.INSTRUCTION_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    instruction.populate(data);

    await instruction.validateOrThrow(ValidationException, ValidatorErrorCode);

    await instruction.update();
    return instruction.serialize(SerializeFor.PROFILE);
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
    return instruction.serialize(SerializeFor.PROFILE);
  }
}
