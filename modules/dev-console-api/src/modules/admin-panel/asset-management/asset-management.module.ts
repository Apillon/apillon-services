import { Module } from '@nestjs/common';
import { AssetManagementService } from './asset-management.service';
import { AssetManagementController } from './asset-management.controller';

@Module({
  imports: [],
  controllers: [AssetManagementController],
  providers: [AssetManagementService],
})
export class AssetManagementModule {}
