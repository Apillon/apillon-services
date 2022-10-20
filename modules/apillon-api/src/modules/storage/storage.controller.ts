import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Ctx, Validation } from 'at-lib';
import { ApillonApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { UploadFilesToIPFSDto } from './dtos/upload-files-to-IPFS';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('/fileOrDirectory')
  async getFileOrDirectory(
    @Ctx() context: ApillonApiContext,
    @Query('cid') cid: string,
  ) {
    return await this.storageService.getFileOrDirectory(context, cid);
  }

  @Get('/listFileOrDirectory')
  async listFileOrDirectory(
    @Ctx() context: ApillonApiContext,
    @Query('cid') cid: string,
  ) {
    return await this.storageService.listDirectory(context, cid);
  }

  @Post()
  @Validation({ dto: UploadFilesToIPFSDto })
  @UseGuards(ValidationGuard)
  async uploadFilesToIPFS(
    @Ctx() context: ApillonApiContext,
    @Body() data: UploadFilesToIPFSDto,
  ) {
    return await this.storageService.uploadFilesToIPFS(context, data);
  }

  @Post('/requestURLForUpload')
  async requestS3URLForUpload(@Ctx() context: ApillonApiContext, @Body() body) {
    return await this.storageService.requestS3SignedURLForUpload(context, body);
  }

  @Post('/fromS3')
  async uploadFilesToIPFSFromS3(
    @Ctx() context: ApillonApiContext,
    @Body() body,
  ) {
    return await this.storageService.uploadFilesToIPFSFromS3(context, body);
  }

  /*
  @Post()
  async uploadFileToIPFS() {
    return await this.storageService.uploadFileToIPFS();
  }

  @Get('/directory')
  async listFilesFromIPFS() {
    return await this.storageService.listIPFSDirectory();
  }

  @Get('/file')
  async getFileFromIPFS() {
    return await this.storageService.getFileFromIPFS();
  }*/
}
