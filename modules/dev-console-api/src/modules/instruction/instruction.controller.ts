import { DefaultUserRole, ValidateFor } from '@apillon/lib';
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
import { ValidationGuard } from '../../guards/validation.guard';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { InstructionQueryFilter } from './dto/instruction-query-filter.dto';
import { InstructionService } from './instruction.service';
import { Instruction } from './models/instruction.model';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('instructions')
export class InstructionController {
  constructor(private readonly instructionService: InstructionService) {}

  @Get()
  @Permissions({ role: DefaultUserRole.USER })
  @Validation({ dto: InstructionQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getInstructions(
    @Ctx() context: DevConsoleApiContext,
    @Query('forRoute') forRoute: string,
  ) {
    return await this.instructionService.getInstructions(context, forRoute);
  }

  @Get(':instructionEnum')
  @Permissions({ role: DefaultUserRole.USER })
  @Validation({ dto: InstructionQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getInstruction(
    @Ctx() context: DevConsoleApiContext,
    @Param('instructionEnum') instructionEnum: string,
  ) {
    return await this.instructionService.getInstruction(
      context,
      instructionEnum,
    );
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

  @Patch(':instructionEnum')
  @Permissions({ role: DefaultUserRole.ADMIN })
  @UseGuards(AuthGuard)
  async updateInstruction(
    @Ctx() context: DevConsoleApiContext,
    @Query('instructionEnum') instructionEnum: string,
    @Body() body: any,
  ) {
    return await this.instructionService.updateInstruction(
      context,
      instructionEnum,
      body,
    );
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
