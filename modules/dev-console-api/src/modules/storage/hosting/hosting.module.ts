import { Module } from '@nestjs/common';
import { ServicesService } from '../../services/services.service';
import { HostingController } from './hosting.controller';
import { HostingService } from './hosting.service';

@Module({
  controllers: [HostingController],
  providers: [HostingService, ServicesService],
})
export class HostingModule {}
