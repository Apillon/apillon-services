import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  BucketQueryFilter,
  BucketQuotaReachedQueryFilter,
  CreateBucketDto,
  CreateBucketWebhookDto,
  DefaultPermission,
  DefaultUserRole,
  ValidateFor,
  CacheKeyPrefix,
  CacheKeyTTL,
  RoleGroup,
} from '@apillon/lib';
import { CacheByProject } from '@apillon/modules-lib';
import { DevConsoleApiContext } from '../../../context';
import {
  Ctx,
  Permissions,
  Validation,
  CacheInterceptor,
} from '@apillon/modules-lib';
import { ValidationGuard } from '../../../guards/validation.guard';
import { BucketService } from './bucket.service';
import { AuthGuard } from '../../../guards/auth.guard';

@Controller('buckets')
@Permissions({ permission: DefaultPermission.STORAGE })
@UseInterceptors(CacheInterceptor)
export class BucketController {
  constructor(private bucketService: BucketService) {}

  @Get(':bucket_uuid/webhook')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getBucketWebhook(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
  ) {
    return await this.bucketService.getBucketWebhook(context, bucket_uuid);
  }

  @Post(':bucket_uuid/webhook')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateBucketWebhookDto })
  @UseGuards(ValidationGuard)
  async createBucketWebhook(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Body() body: CreateBucketWebhookDto,
  ) {
    return await this.bucketService.createBucketWebhook(
      context,
      bucket_uuid,
      body,
    );
  }

  @Patch(':bucket_uuid/webhook/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateBucketWebhookDto })
  @UseGuards(ValidationGuard)
  async updateBucketWebhook(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateBucketWebhookDto,
  ) {
    return await this.bucketService.updateBucketWebhook(
      context,
      bucket_uuid,
      id,
      body,
    );
  }

  @Delete(':bucket_uuid/webhook/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteBucketWebhook(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.bucketService.deleteBucketWebhook(context, id);
  }

  @Get('quota-reached')
  @Permissions({ role: DefaultUserRole.USER })
  @Validation({
    dto: BucketQuotaReachedQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async isMaxBucketQuotaReached(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BucketQuotaReachedQueryFilter,
  ) {
    return await this.bucketService.isMaxBucketQuotaReached(context, query);
  }

  @Get()
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BucketQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  @CacheByProject({
    keyPrefix: CacheKeyPrefix.BUCKET_LIST,
    ttl: CacheKeyTTL.EXTRA_LONG,
  })
  async getBucketList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BucketQueryFilter,
  ) {
    return await this.bucketService.getBucketList(context, query);
  }

  @Get(':bucket_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
  ) {
    return await this.bucketService.getBucket(context, bucket_uuid);
  }

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateBucketDto })
  @UseGuards(ValidationGuard)
  async createBucket(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateBucketDto,
  ) {
    return await this.bucketService.createBucket(context, body);
  }

  @Patch(':bucket_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Body() body: any,
  ) {
    return await this.bucketService.updateBucket(context, bucket_uuid, body);
  }

  @Patch(':bucket_uuid/cancel-deletion')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async cancelBucketDeletion(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
  ) {
    return await this.bucketService.cancelBucketDeletion(context, bucket_uuid);
  }

  @Delete(':bucket_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
  ) {
    return await this.bucketService.deleteBucket(context, bucket_uuid);
  }

  @Delete(':bucket_uuid/content')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async clearBucketContent(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
  ) {
    return await this.bucketService.clearBucketContent(context, bucket_uuid);
  }
}
