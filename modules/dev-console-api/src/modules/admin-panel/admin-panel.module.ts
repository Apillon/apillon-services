import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [UserModule, ProjectModule, BlockchainModule, DashboardModule],
  controllers: [],
  providers: [],
})
export class AdminPanelModule {}
