import {
  CreateS3SignedUrlForUploadDto,
  DefaultApiKeyRole,
  DefaultUserRole,
} from '@apillon/lib';
import { Ctx, Validation, Permissions } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('file-upload-request')
  @Permissions({ role: DefaultApiKeyRole.KEY_EXECUTE })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateS3SignedUrlForUploadDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createS3SignedUrlForUpload(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateS3SignedUrlForUploadDto,
  ) {
    return await this.storageService.createS3SignedUrlForUpload(context, body);
  }

  @Get('/file-details/cid/:cid')
  @Permissions({ role: DefaultApiKeyRole.KEY_READ })
  @UseGuards(AuthGuard)
  async getFileDetailsByCID(
    @Ctx() context: ApillonApiContext,
    @Param('cid') cid: string,
  ) {
    return await this.storageService.getFileDetails(context, cid);
  }

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
