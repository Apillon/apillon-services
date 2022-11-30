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

  @Post('file-upload-request')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateS3SignedUrlForUploadDto })
  @UseGuards(ValidationGuard)
  async createS3SignedUrlForUpload(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateS3SignedUrlForUploadDto,
  ) {
    return await this.storageService.createS3SignedUrlForUpload(context, body);
  }

  @Post('file-upload-session/:session_uuid/end')
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
    @Param('session_uuid') session_uuid: string,
    @Body() body: EndFileUploadSessionDto,
  ) {
    return await this.storageService.endFileUploadSession(
      context,
      session_uuid,
      body,
    );
  }

  @Get('file-details')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: FileDetailsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getBucketList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: FileDetailsQueryFilter,
  ) {
    return await this.storageService.getFileDetails(context, query);
  }
}
