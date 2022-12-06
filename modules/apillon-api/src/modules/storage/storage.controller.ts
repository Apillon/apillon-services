import {
  AttachedServiceType,
  CreateS3SignedUrlForUploadDto,
  DefaultApiKeyRole,
  EndFileUploadSessionDto,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
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
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateS3SignedUrlForUploadDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createS3SignedUrlForUpload(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateS3SignedUrlForUploadDto,
  ) {
    return await this.storageService.createS3SignedUrlForUpload(context, body);
  }

  @Post('file-upload-session/:session_uuid/end')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: EndFileUploadSessionDto })
  @UseGuards(ValidationGuard)
  @HttpCode(200)
  async endFileUploadSession(
    @Ctx() context: ApillonApiContext,
    @Param('session_uuid') session_uuid: string,
    @Body() body: EndFileUploadSessionDto,
  ) {
    return await this.storageService.endFileUploadSession(
      context,
      session_uuid,
      body,
    );
  }

  @Get('/file-details/cid/:cid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getFileDetailsByCID(
    @Ctx() context: ApillonApiContext,
    @Param('cid') cid: string,
  ) {
    return await this.storageService.getFileDetailsByCID(context, cid);
  }

  @Get('/file-details/file_uuid/:file_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getFileDetailsByFileUUID(
    @Ctx() context: ApillonApiContext,
    @Param('file_uuid') file_uuid: string,
  ) {
    return await this.storageService.getFileDetailsByCID(context, file_uuid);
  }
}
