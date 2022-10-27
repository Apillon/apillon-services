import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  CreateS3SignedUrlForUploadDto,
  PermissionLevel,
  PermissionType,
} from 'at-lib';
import { Ctx } from '../../decorators/context.decorator';
import { Permissions } from '../../decorators/permission.decorator';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { StorageService } from './storage.service';
import { Validation } from '../../decorators/validation.decorator';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('/createSignedUrlForUpload')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateS3SignedUrlForUploadDto })
  @UseGuards(ValidationGuard)
  async createS3SignedUrlForUpload(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateS3SignedUrlForUploadDto,
  ) {
    return await this.storageService.createS3SignedUrlForUpload(context, body);
  }

  @Post('/endFileUploadSession/:session_uuid')
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  async endFileUploadSession(
    @Ctx() context: DevConsoleApiContext,
    @Param('session_uuid') session_uuid: string,
  ) {
    return await this.storageService.endFileUploadSession(
      context,
      session_uuid,
    );
  }
}
