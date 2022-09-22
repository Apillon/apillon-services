import { HttpStatus, Injectable, Patch } from '@nestjs/common';
import { CodeException, ValidationException } from 'at-lib';
import { ResourceNotFoundErrorCode, ValidatorErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { Instruction } from './models/instruction.model';
import { InstructionModule } from './instruction.module';

@Injectable()
export class InstructionService {
  async getInstruction(context: DevConsoleApiContext, id: number) {
    let instruction: Instruction = await new Instruction({}, { context }).populateById(id);
    if (!instruction.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.INSTRUCTION_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    return instruction.serialize();
  }

  async createInstruction(context: DevConsoleApiContext, body: any) {
    return await body.insert();
  }
}
