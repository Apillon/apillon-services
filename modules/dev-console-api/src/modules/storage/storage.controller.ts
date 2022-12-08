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
import {
  CreateS3SignedUrlForUploadDto,
  DefaultUserRole,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { StorageService } from './storage.service';
import { AuthGuard } from '../../guards/auth.guard';

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

  @Get(':bucket_uuid/file/:cidOrUUID/detail')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async getFileDetailsByCID(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Param('cidOrUUID') cidOrUUID: string,
  ) {
    return await this.storageService.getFileDetails(
      context,
      bucket_uuid,
      cidOrUUID,
    );
  }
}
