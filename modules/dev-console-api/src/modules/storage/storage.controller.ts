import {
  CreateS3SignedUrlForUploadDto,
  DefaultUserRole,
  EndFileUploadSessionDto,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post(':bucket_uuid/file-upload/:session_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateS3SignedUrlForUploadDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createS3SignedUrlForUpload(
    @Ctx() context: DevConsoleApiContext,
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

  @Delete(':bucket_uuid/file/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteFile(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') id: string,
  ) {
    return await this.storageService.deleteFile(context, id);
  }
}
