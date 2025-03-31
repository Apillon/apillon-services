import { Module } from '@nestjs/common';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { ServicesModule } from '../services/services.module';
import { BackendsService } from './backends.service';

@Module({
  imports: [ServicesModule],
  controllers: [DeployController],
  providers: [DeployService, BackendsService],
})
export class DeployModule {}
