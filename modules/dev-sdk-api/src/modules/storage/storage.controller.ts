import { Controller, Post } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post()
  async uploadFileToIPFS() {
    return await this.storageService.uploadFileToIPFS();
  }
}
