import { Body, Controller, Param, Query, Post, Patch, Get, ParseIntPipe, UseGuards, Delete } from '@nestjs/common';
import { Ctx, PermissionLevel, PermissionType, Validation, Permissions } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';

import { InstructionService } from './instruction.service';
import { Instruction } from './models/instruction.model';
import { InstructionGetInstructionFilter } from './dto/instruction-query-filter.dto';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('instruction')
export class InstructionController {
  constructor(private readonly instructionService: InstructionService) {}

  @Get('/')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  @Validation({ dto: InstructionGetInstructionFilter })
  async getInstruction(@Ctx() context: DevConsoleApiContext, @Query('instruction_enum') instruction_enum: string) {
    return await this.instructionService.getInstruction(context, instruction_enum);
  }

  @Post()
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @Validation({ dto: Instruction })
  @UseGuards(ValidationGuard, AuthGuard)
  async createInstruction(@Ctx() context: DevConsoleApiContext, @Body() body: Instruction) {
    return await this.instructionService.createInstruction(context, body);
  }

  @Patch('/')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @Validation({ dto: Instruction })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateInstruction(
    @Ctx() context: DevConsoleApiContext,
    @Query('instruction_enum') instruction_enum: string,
    @Body() body: any,
  ) {
    return await this.instructionService.updateInstruction(context, instruction_enum, body);
  }

  @Delete('/')
  @Permissions({ permission: 1, type: PermissionType.WRITE, level: PermissionLevel.OWN })
  @UseGuards(ValidationGuard, AuthGuard)
  async deleteInstruction(@Ctx() context: DevConsoleApiContext, @Query('instruction_enum') instruction_enum: string) {
    return await this.instructionService.deleteInstruction(context, instruction_enum);
  }
}
