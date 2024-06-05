import { Module } from '@nestjs/common';
import { OasisController } from './oasis.controller';
import { OasisService } from './oasis.service';

@Module({
  controllers: [OasisController],
  providers: [OasisService],
})
export class OasisModule {}
