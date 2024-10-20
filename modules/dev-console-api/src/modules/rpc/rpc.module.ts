import { Module } from '@nestjs/common';
import { RpcController } from './rpc.controller';
import { RpcService } from './rpc.service';
@Module({
  controllers: [RpcController],
  providers: [RpcService],
})
export class RpcModule {}
