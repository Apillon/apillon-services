import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { Ctx } from '../../decorators/context.decorator';
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

  @Post('/fromS3')
  async uploadFilesToIPFSFromS3(
    @Ctx() context: ApillonApiContext,
    @Body() body,
  ) {
    return await this.storageService.uploadFilesToIPFSFromS3(context, body);
  }
}
