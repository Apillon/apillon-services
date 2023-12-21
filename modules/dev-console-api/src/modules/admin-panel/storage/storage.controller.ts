import {
  BucketQueryFilter,
  CacheKeyPrefix,
  DefaultUserRole,
  ValidateFor,
  WebsiteQueryFilter,
} from '@apillon/lib';
import {
  CacheInterceptor,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { Cache } from '@apillon/modules-lib';
import { StorageService } from './storage.service';
import { ValidationGuard } from '../../../guards/validation.guard';

@Controller('admin-panel/storage')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('buckets')
  @Validation({
    dto: BucketQueryFilter,
    validateFor: ValidateFor.QUERY,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  @Cache({ keyPrefix: CacheKeyPrefix.ADMIN_BUCKET_LIST })
  async getBucketList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BucketQueryFilter,
  ) {
    return await this.storageService.getBucketList(context, query);
  }

  @Get('websites')
  @Validation({
    dto: WebsiteQueryFilter,
    validateFor: ValidateFor.QUERY,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  @Cache({ keyPrefix: CacheKeyPrefix.ADMIN_WEBSITE_LIST })
  async getWebsiteList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: WebsiteQueryFilter,
  ) {
    return await this.storageService.getWebsiteList(context, query);
  }
}
