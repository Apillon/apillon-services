import {
  ApillonApiBucketQueryFilter,
  ApillonApiCreateBucketDto,
  ApillonApiCreateS3UrlsForUploadDto,
  ApillonApiDirectoryContentQueryFilter,
  AttachedServiceType,
  DefaultApiKeyRole,
  EndFileUploadSessionDto,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
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

  @Get('buckets')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({
    dto: ApillonApiBucketQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  @HttpCode(200)
  async listBuckets(
    @Ctx() context: ApillonApiContext,
    @Query() query: ApillonApiBucketQueryFilter,
  ) {
    query.project_uuid = context.apiKey.project_uuid;
    return await this.storageService.listBuckets(context, query);
  }

  @Post('buckets')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({ dto: ApillonApiCreateBucketDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async createCollection(
    @Ctx() context: ApillonApiContext,
    @Body() body: ApillonApiCreateBucketDto,
  ) {
    body.project_uuid = context.apiKey.project_uuid;
    return await this.storageService.createBucket(context, body);
  }

  //#region legacy routes

  @Post([':bucketUuid/upload', 'buckets/:bucketUuid/upload'])
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: ApillonApiCreateS3UrlsForUploadDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createS3SignedUrlsForUpload(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
    @Body()
    body: ApillonApiCreateS3UrlsForUploadDto,
  ) {
    return await this.storageService.createS3SignedUrlsForUpload(
      context,
      bucket_uuid,
      body,
    );
  }

  @Post([
    ':bucketUuid/upload/:sessionUuid/end',
    'buckets/:bucketUuid/upload/:sessionUuid/end',
  ])
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
    @Param('bucketUuid') bucket_uuid: string,
    @Param('sessionUuid') session_uuid: string,
    @Body() body: EndFileUploadSessionDto,
  ) {
    return await this.storageService.endFileUploadSession(
      context,
      bucket_uuid,
      session_uuid,
      body,
    );
  }

  @Get([':bucketUuid/file/:id/detail', 'buckets/:bucketUuid/file/:id/detail'])
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getFileDetails(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
    @Param('id') id: string,
  ) {
    return await this.storageService.getFileDetails(context, bucket_uuid, id);
  }

  @Delete([':bucketUuid/file/:id', 'buckets/:bucketUuid/file/:id'])
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async deleteFile(@Ctx() context: ApillonApiContext, @Param('id') id: string) {
    return await this.storageService.deleteFile(context, id);
  }

  @Get([':bucketUuid/content', 'buckets/:bucketUuid/content'])
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
    @Param('bucketUuid') bucket_uuid: string,
    @Query() query: ApillonApiDirectoryContentQueryFilter,
  ) {
    return await this.storageService.listContent(context, bucket_uuid, query);
  }
}
