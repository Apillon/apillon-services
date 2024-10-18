import { Module } from '@nestjs/common';
import { RpcController } from './rpc.controller';
import { RpcService } from './rpc.service';
import { ServicesModule } from '../services/services.module';
import { ServicesService } from '../services/services.service';
@Module({
  controllers: [RpcController],
  providers: [RpcService, ServicesService],
})
export class RpcModule {}
