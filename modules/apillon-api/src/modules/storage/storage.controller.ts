import {
  ApillonApiCreateBucketDto,
  ApillonApiCreateS3UrlsForUploadDto,
  ApillonApiDirectoryContentQueryFilter,
  ApillonApiFilesQueryFilter,
  AttachedServiceType,
  BaseProjectQueryFilter,
  BucketQueryFilter,
  CreateIpnsDto,
  DefaultApiKeyRole,
  EndFileUploadSessionDto,
  GetLinksDto,
  IpnsQueryFilter,
  PublishIpnsDto,
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
  Patch,
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

  @Get('info')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getStorageInfo(
    @Ctx() context: ApillonApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.storageService.getStorageInfo(context, query);
  }

  @Get('ipfs-cluster-info')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getIpfsClusterInfo(
    @Ctx() context: ApillonApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.storageService.getIpfsClusterInfo(context, query);
  }

  @Get('link-on-ipfs/:cid')
  @ApiKeyPermissions(
    {
      role: DefaultApiKeyRole.KEY_READ,
      serviceType: AttachedServiceType.STORAGE,
    },
    {
      role: DefaultApiKeyRole.KEY_READ,
      serviceType: AttachedServiceType.HOSTING,
    },
  )
  @UseGuards(AuthGuard)
  async getLinkOnIpfs(
    @Ctx() context: ApillonApiContext,
    @Param('cid') cid: string,
    @Query('type') type: string,
  ) {
    return await this.storageService.getLink(
      context,
      cid,
      type ? type.toLowerCase() : 'cid',
    );
  }

  @Post('link-on-ipfs-multiple')
  @ApiKeyPermissions(
    {
      role: DefaultApiKeyRole.KEY_READ,
      serviceType: AttachedServiceType.STORAGE,
    },
    {
      role: DefaultApiKeyRole.KEY_READ,
      serviceType: AttachedServiceType.HOSTING,
    },
  )
  @Validation({ dto: GetLinksDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async getLinksOnIpfsMultiple(
    @Ctx() context: ApillonApiContext,
    @Body() body: GetLinksDto,
  ) {
    return await this.storageService.getLinks(context, body);
  }

  @Get('buckets')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({
    dto: BucketQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  @HttpCode(200)
  async listBuckets(
    @Ctx() context: ApillonApiContext,
    @Query() query: BucketQueryFilter,
  ) {
    query.project_uuid = context.apiKey.project_uuid;
    return await this.storageService.listBuckets(context, query);
  }

  @Get('buckets/:bucketUuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getBucket(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
  ) {
    return await this.storageService.getBucket(context, bucket_uuid);
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
  @Validation({ dto: EndFileUploadSessionDto })
  @UseGuards(AuthGuard, ValidationGuard)
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

  @Get([':bucketUuid/file/:uuid/detail', 'buckets/:bucketUuid/files/:uuid'])
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getFileDetails(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
    @Param('uuid') uuid: string,
  ) {
    return await this.storageService.getFileDetails(context, bucket_uuid, uuid);
  }

  @Delete([
    ':bucketUuid/file/:file_uuid',
    'buckets/:bucketUuid/files/:file_uuid',
  ])
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async deleteFile(
    @Ctx() context: ApillonApiContext,
    @Param('file_uuid') file_uuid: string,
  ) {
    return await this.storageService.deleteFile(context, file_uuid);
  }

  @Get([':bucketUuid/content', 'buckets/:bucketUuid/content'])
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({
    dto: ApillonApiDirectoryContentQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listContent(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
    @Query() query: ApillonApiDirectoryContentQueryFilter,
  ) {
    return await this.storageService.listContent(context, bucket_uuid, query);
  }

  @Get('buckets/:bucketUuid/files')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({
    dto: ApillonApiFilesQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listFiles(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
    @Query() query: ApillonApiFilesQueryFilter,
  ) {
    return await this.storageService.listFiles(context, bucket_uuid, query);
  }

  @Delete('buckets/:bucketUuid/directories/:directoryUuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async deleteDirectory(
    @Ctx() context: ApillonApiContext,
    @Param('directoryUuid') directory_uuid: string,
  ) {
    return await this.storageService.deleteDirectory(context, directory_uuid);
  }

  @Get('blacklist')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SYSTEM,
  })
  @UseGuards(AuthGuard)
  async listDomains(@Ctx() context: ApillonApiContext) {
    return await this.storageService.getBlacklist(context);
  }

  //#region ipns endpoints

  @Get('buckets/:bucketUuid/ipns')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @Validation({ dto: IpnsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getIpnsList(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
    @Query() query: IpnsQueryFilter,
  ) {
    return await this.storageService.getIpnsList(context, bucket_uuid, query);
  }

  @Get('buckets/:bucketUuid/ipns/:ipnsUuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getIpns(
    @Ctx() context: ApillonApiContext,
    @Param('ipnsUuid') ipns_uuid: string,
  ) {
    return await this.storageService.getIpns(context, ipns_uuid);
  }

  @Post('buckets/:bucketUuid/ipns')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateIpnsDto })
  @UseGuards(ValidationGuard)
  async createIpnsRecord(
    @Ctx() context: ApillonApiContext,
    @Param('bucketUuid') bucket_uuid: string,
    @Body() body: CreateIpnsDto,
  ) {
    return await this.storageService.createIpns(context, bucket_uuid, body);
  }

  @Patch('buckets/:bucketUuid/ipns/:ipnsUuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async updateIpns(
    @Ctx() context: ApillonApiContext,
    @Param('ipnsUuid') ipns_uuid: string,
    @Body() body: any,
  ) {
    return await this.storageService.updateIpns(context, ipns_uuid, body);
  }

  @Delete('buckets/:bucketUuid/ipns/:ipnsUuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async deleteIpns(
    @Ctx() context: ApillonApiContext,
    @Param('ipnsUuid') ipns_uuid: string,
  ) {
    return await this.storageService.deleteIpns(context, ipns_uuid);
  }

  @Post('buckets/:bucketUuid/ipns/:ipnsUuid/publish')
  @HttpCode(200)
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: PublishIpnsDto, skipValidation: true })
  @UseGuards(ValidationGuard)
  async publishIpns(
    @Ctx() context: ApillonApiContext,
    @Param('ipnsUuid') ipns_uuid: string,
    @Body() body: PublishIpnsDto,
  ) {
    return await this.storageService.publishIpns(context, ipns_uuid, body);
  }

  //#endregion
}
