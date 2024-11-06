import { Module } from '@nestjs/common';
import { ServiceStatusController } from './service-status.controller';
import { ServiceStatusService } from './service-status.service';

@Module({
  controllers: [ServiceStatusController],
  providers: [ServiceStatusService],
})
export class ServiceStatusModule {}
