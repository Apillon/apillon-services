import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [UserModule, ProjectModule, BlockchainModule],
  controllers: [],
  providers: [],
})
export class AdminPanelModule {}
