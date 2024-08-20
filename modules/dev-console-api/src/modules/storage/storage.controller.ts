import {
  BaseProjectQueryFilter,
  CreateS3UrlsForUploadDto,
  DefaultPermission,
  DefaultUserRole,
  EndFileUploadSessionDto,
  FileUploadSessionQueryFilter,
  FileUploadsQueryFilter,
  FilesQueryFilter,
  LinkOnIpfsQueryFilter,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
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
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { StorageService } from './storage.service';

@Controller('storage')
@Permissions({ permission: DefaultPermission.STORAGE })
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('info')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getStorageInfo(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.storageService.getStorageInfo(context, query);
  }

  @Get('ipfs-cluster-info')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getIpfsClusterInfo(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.storageService.getIpfsClusterInfo(context, query);
  }

  @Get('link-on-ipfs')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: LinkOnIpfsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getLinkOnIpfs(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: LinkOnIpfsQueryFilter,
  ) {
    return await this.storageService.getLink(context, query);
  }

  @Get(':bucket_uuid/file-uploads')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: FileUploadsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listFileUploads(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Query() query: FileUploadsQueryFilter,
  ) {
    return await this.storageService.listFileUploads(
      context,
      bucket_uuid,
      query,
    );
  }

  @Get(':bucket_uuid/file-upload-sessions')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: FileUploadSessionQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listFileUploadSessions(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Query() query: FileUploadSessionQueryFilter,
  ) {
    return await this.storageService.listFileUploadSessions(
      context,
      bucket_uuid,
      query,
    );
  }

  @Post(':bucket_uuid/files-upload')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: CreateS3UrlsForUploadDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createS3SignedUrlsForUpload(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Body()
    body: CreateS3UrlsForUploadDto,
  ) {
    return await this.storageService.createS3SignedUrlsForUpload(
      context,
      bucket_uuid,
      body,
    );
  }

  @Post(':bucket_uuid/file-upload/:session_uuid/end')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: EndFileUploadSessionDto })
  @UseGuards(AuthGuard, ValidationGuard)
  @HttpCode(200)
  async endFileUploadSession(
    @Ctx() context: DevConsoleApiContext,
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

  @Post(':bucket_uuid/file/:file_uuid/sync-to-ipfs')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async syncFileToIPFS(
    @Ctx() context: DevConsoleApiContext,
    @Param('file_uuid') id: string,
  ) {
    return await this.storageService.syncFileToIPFS(context, id);
  }

  @Get(':bucket_uuid/files')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: FilesQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listFiles(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Query() query: FilesQueryFilter,
  ) {
    return await this.storageService.listFiles(context, bucket_uuid, query);
  }

  @Get(':bucket_uuid/file/:uuid/detail')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getFileDetailsByCID(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Param('uuid') uuid: string,
  ) {
    return await this.storageService.getFileDetails(context, bucket_uuid, uuid);
  }

  @Get(':bucket_uuid/trashed-files')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: FilesQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeletedFiles(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Query() query: FilesQueryFilter,
  ) {
    return await this.storageService.listDeletedFiles(
      context,
      bucket_uuid,
      query,
    );
  }

  @Delete(':bucket_uuid/file/:uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async deleteFile(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.storageService.deleteFile(context, uuid);
  }

  @Patch(':bucket_uuid/file/:uuid/restore')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async restoreFile(
    @Ctx() context: DevConsoleApiContext,
    @Param('uuid') uuid: string,
  ) {
    return await this.storageService.restoreFile(context, uuid);
  }

  @Post('test-crust-provider')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async testCrustProvider(
    @Ctx() context: DevConsoleApiContext,
    @Query('providerEndpoint') providerEndpoint: string,
  ) {
    return await this.storageService.testCrustProvider(
      context,
      providerEndpoint,
    );
  }
}
