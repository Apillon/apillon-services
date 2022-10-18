import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  CreateBucketDto,
  Ctx,
  PermissionLevel,
  Permissions,
  PermissionType,
  Validation,
} from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { BucketService } from './bucket.service';

@Controller('bucket')
export class BucketController {
  constructor(private bucketService: BucketService) {}

  @Post()
  @Permissions({
    permission: 1,
    type: PermissionType.WRITE,
    level: PermissionLevel.OWN,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateBucketDto })
  @UseGuards(ValidationGuard)
  async createProject(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateBucketDto,
  ) {
    return await this.bucketService.createBucket(context, body);
  }
}
