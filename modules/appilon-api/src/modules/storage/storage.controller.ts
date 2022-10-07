import { Controller, Get, Post } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post()
  async uploadFileToIPFS() {
    return await this.storageService.uploadFileToIPFS();
  }

  @Post('/files')
  async uploadFilesToIPFS() {
    return await this.storageService.uploadFilesToIPFS();
  }

  @Post('/withMicroservice')
  async uploadFileToIPFSWithMicroservice() {
    return await this.storageService.uploadFileToIPFSWithMicroservice();
  }

  @Post('/test')
  async uploadTest() {
    return await this.storageService.test();
  }

  @Get('/directory')
  async listFilesFromIPFS() {
    return await this.storageService.listIPFSDirectory();
  }

  @Get('/file')
  async getFileFromIPFS() {
    return await this.storageService.getFileFromIPFS();
  }

  @Get('/fileOrDirectory')
  async getFileOrDirectoryFromIPFS() {
    return await this.storageService.getFileOrDirectoryFromIPFS();
  }
}
