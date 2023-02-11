import { DefaultUserRole } from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { InstructionService } from './instruction.service';
import { Instruction } from './models/instruction.model';

@Controller('instructions')
export class InstructionController {
  constructor(private readonly instructionService: InstructionService) {}

  @Get()
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getInstructions(
    @Ctx() context: DevConsoleApiContext,
    @Query('forRoute') forRoute: string,
  ) {
    return await this.instructionService.getInstructions(context, forRoute);
  }

  @Post()
  @Permissions({ role: DefaultUserRole.ADMIN })
  @Validation({ dto: Instruction })
  @UseGuards(ValidationGuard, AuthGuard)
  async createInstruction(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: Instruction,
  ) {
    return await this.instructionService.createInstruction(context, body);
  }

  @Patch(':id')
  @Permissions({ role: DefaultUserRole.ADMIN })
  @UseGuards(AuthGuard)
  async updateInstruction(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.instructionService.updateInstruction(context, id, body);
  }

  @Delete(':id')
  @Permissions({ role: DefaultUserRole.ADMIN })
  @UseGuards(AuthGuard)
  async deleteInstruction(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.instructionService.deleteInstruction(context, id);
  }
}
