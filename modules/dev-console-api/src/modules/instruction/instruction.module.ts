import { Module } from '@nestjs/common';
import { InstructionController } from './instruction.controller';
import { InstructionService } from './instruction.service';

@Module({
  controllers: [InstructionController],
  providers: [InstructionService],
})
export class InstructionModule {}
