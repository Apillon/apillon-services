import { Body, Controller, Param, Query, Post, Patch, Get, ParseIntPipe, UseGuards, Delete } from '@nestjs/common';
import { Ctx, PermissionLevel, PermissionType, Validation, Permissions } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';

import { InstructionService } from './instruction.service';
import { Instruction } from './models/instruction.model';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('instruction')
export class InstructionController {
  constructor(private readonly instructionService: InstructionService) {}
  @Get()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async getInstructionList(@Ctx() context: DevConsoleApiContext, @Query('type') type: string) {
    return;
  }

  @Post()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @Validation({ dto: Instruction })
  @UseGuards(ValidationGuard, AuthGuard)
  async createInstruction(@Ctx() context: DevConsoleApiContext, @Body() body: Instruction) {
    return await this.instructionService.createInstruction(context, body);
  }
}
