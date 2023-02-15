import { Module } from '@nestjs/common';
import { IpnsController } from './ipns.controller';
import { IpnsService } from './ipns.service';

@Module({
  controllers: [IpnsController],
  providers: [IpnsService],
})
export class IpnsModule {}
