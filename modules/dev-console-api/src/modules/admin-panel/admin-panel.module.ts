import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [UserModule, ProjectModule, BlockchainModule, CacheModule],
  controllers: [],
  providers: [],
})
export class AdminPanelModule {}
