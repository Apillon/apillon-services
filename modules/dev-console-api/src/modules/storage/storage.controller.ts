import {
  CreateS3UrlsForUploadDto,
  FileUploadsQueryFilter,
  TrashedFilesQueryFilter,
} from '@apillon/lib';
import { ValidateFor } from '@apillon/lib';
import { DefaultUserRole, EndFileUploadSessionDto } from '@apillon/lib';
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
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get(':bucket_uuid/file-uploads')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
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

  @Post(':bucket_uuid/files-upload')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @Validation({ dto: EndFileUploadSessionDto })
  @UseGuards(ValidationGuard)
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

  @Get(':bucket_uuid/file/:id/detail')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async getFileDetailsByCID(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Param('id') id: string,
  ) {
    return await this.storageService.getFileDetails(context, bucket_uuid, id);
  }

  @Get(':bucket_uuid/trashed-files')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: TrashedFilesQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listFilesMarkedForDeletion(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Query() query: TrashedFilesQueryFilter,
  ) {
    return await this.storageService.listFilesMarkedForDeletion(
      context,
      bucket_uuid,
      query,
    );
  }

  @Delete(':bucket_uuid/file/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async deleteFile(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') id: string,
  ) {
    return await this.storageService.deleteFile(context, id);
  }

  @Patch(':bucket_uuid/file/:id/cancel-deletion')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async cancelFileDeletion(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') id: string,
  ) {
    return await this.storageService.cancelFileDeletion(context, id);
  }
}
