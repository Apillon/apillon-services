import { Module } from '@nestjs/common';
import { RpcService } from './rpc.service';
import { RpcController } from './rpc.controller';

@Module({
  imports: [],
  controllers: [RpcController],
  providers: [RpcService],
})
export class RpcModule {}
