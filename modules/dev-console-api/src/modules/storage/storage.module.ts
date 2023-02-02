import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { HostingModule } from './hosting/hosting.module';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  imports: [HostingModule],
})
export class StorageModule {}
