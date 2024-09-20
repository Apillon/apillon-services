import { Module } from '@nestjs/common';
import { RpcController } from './rpc.controller';
import { RpcService } from './rpc.service';
import { UserModule } from '../user/user.module';
@Module({
  imports: [UserModule],
  controllers: [RpcController],
  providers: [RpcService],
})
export class RpcModule {}
