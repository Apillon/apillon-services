import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';

@Module({
  imports: [],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
