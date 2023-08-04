import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CacheModule } from './cache/cache.module';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    UserModule,
    ProjectModule,
    BlockchainModule,
    DashboardModule,
    CacheModule,
    LogsModule,
  ],
  controllers: [],
  providers: [],
})
export class AdminPanelModule {}
