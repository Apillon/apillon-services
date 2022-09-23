import { HttpStatus, Injectable, Patch } from '@nestjs/common';
import { CodeException, ValidationException } from 'at-lib';
import { ResourceNotFoundErrorCode, ValidatorErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { Instruction } from './models/instruction.model';
import { InstructionModule } from './instruction.module';

@Injectable()
export class InstructionService {
  async getInstruction(context: DevConsoleApiContext, instruction_enum: string) {
    return await new Instruction({}).getInstruction(context, instruction_enum);
  }

  async createInstruction(context: DevConsoleApiContext, body: any) {
    return await body.insert();
  }
}
