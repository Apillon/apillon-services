import {
  BucketQueryFilter,
  CacheKeyPrefix,
  DefaultUserRole,
} from '@apillon/lib';
import {
  Cache,
  CacheInterceptor,
  Ctx,
  Permissions,
} from '@apillon/modules-lib';
import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { BaseQueryFilterValidator } from '../../decorators/base-query-filter-validator';
import { AdminPanelService } from './admin-panel.service';

@Controller('admin-panel')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class AdminPanelController {
  constructor(private readonly adminPanelService: AdminPanelService) {}

  @Get('search')
  @BaseQueryFilterValidator()
  @UseGuards(ValidationGuard)
  @Cache({ keyPrefix: CacheKeyPrefix.ADMIN_BUCKET_LIST })
  async generalSearch(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BucketQueryFilter,
  ) {
    return await this.adminPanelService.generalSearch(context, query);
  }
}
