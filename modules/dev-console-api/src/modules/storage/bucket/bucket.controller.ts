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
} from '@nestjs/common';
import {
  BucketQueryFilter,
  BucketQuotaReachedQueryFilter,
  CreateBucketDto,
  CreateBucketWebhookDto,
  DefaultPermission,
  DefaultUserRole,
  ValidateFor,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../../context';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { ValidationGuard } from '../../../guards/validation.guard';
import { BucketService } from './bucket.service';
import { AuthGuard } from '../../../guards/auth.guard';

@Controller('buckets')
@Permissions({ permission: DefaultPermission.STORAGE })
export class BucketController {
  constructor(private bucketService: BucketService) {}

  @Get(':bucket_id/webhook')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async getBucketWebhook(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_id', ParseIntPipe) bucket_id: number,
  ) {
    return await this.bucketService.getBucketWebhook(context, bucket_id);
  }

  @Post(':bucket_id/webhook')
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
    @Param('bucket_id', ParseIntPipe) bucket_id: number,
    @Body() body: CreateBucketWebhookDto,
  ) {
    return await this.bucketService.createBucketWebhook(
      context,
      bucket_id,
      body,
    );
  }

  @Patch(':bucket_id/webhook/:id')
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
    @Param('bucket_id', ParseIntPipe) bucket_id: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateBucketWebhookDto,
  ) {
    return await this.bucketService.updateBucketWebhook(
      context,
      bucket_id,
      id,
      body,
    );
  }

  @Delete(':bucket_id/webhook/:id')
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
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: BucketQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getBucketList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BucketQueryFilter,
  ) {
    return await this.bucketService.getBucketList(context, query);
  }

  @Get(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async getBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('id') id: number | string,
  ) {
    return await this.bucketService.getBucket(context, id);
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

  @Patch(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.bucketService.updateBucket(context, id, body);
  }

  @Patch(':id/cancel-deletion')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async cancelBucketDeletion(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.bucketService.cancelBucketDeletion(context, id);
  }

  @Delete(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteBucket(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.bucketService.deleteBucket(context, id);
  }

  @Delete(':id/content')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  async clearBucketContent(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.bucketService.clearBucketContent(context, id);
  }
}
