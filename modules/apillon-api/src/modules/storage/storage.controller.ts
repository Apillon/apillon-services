import {
  ApillonApiDirectoryContentQueryFilter,
  AttachedServiceType,
  CreateS3SignedUrlForUploadDto,
  DefaultApiKeyRole,
  EndFileUploadSessionDto,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
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

  @Post(':bucket_uuid/file-upload/:session_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateS3SignedUrlForUploadDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createS3SignedUrlForUpload(
    @Ctx() context: ApillonApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Param('session_uuid') session_uuid: string,
    @Body()
    body: CreateS3SignedUrlForUploadDto,
  ) {
    return await this.storageService.createS3SignedUrlForUpload(
      context,
      bucket_uuid,
      session_uuid,
      body,
    );
  }

  @Post(':bucket_uuid/file-upload/:session_uuid/end')
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
    @Param('bucket_uuid') bucket_uuid: string,
    @Param('session_uuid') session_uuid: string,
    @Body() body: EndFileUploadSessionDto,
  ) {
    return await this.storageService.endFileUploadSession(
      context,
      bucket_uuid,
      session_uuid,
      body,
    );
  }

  @Get(':bucket_uuid/file/:id/detail')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getFileDetailsByCID(
    @Ctx() context: ApillonApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Param('id') id: string,
  ) {
    return await this.storageService.getFileDetails(context, bucket_uuid, id);
  }

  @Get(':bucket_uuid/content')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({
    dto: ApillonApiDirectoryContentQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard)
  async listContent(
    @Ctx() context: ApillonApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Query() query: ApillonApiDirectoryContentQueryFilter,
  ) {
    return await this.storageService.listContent(context, bucket_uuid, query);
  }
}
