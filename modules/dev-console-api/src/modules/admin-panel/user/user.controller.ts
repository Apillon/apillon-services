import {
  BaseQueryFilter,
  CreateQuotaOverrideDto,
  DefaultUserRole,
  PopulateFrom,
  QuotaOverrideDto,
  ValidateFor,
  CacheKeyPrefix,
  QuotaType,
  QuotaDto,
  GetQuotasDto,
} from '@apillon/lib';
import {
  Ctx,
  Permissions,
  Validation,
  CacheInterceptor,
} from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth.guard';
import { UserService } from './user.service';
import { DevConsoleApiContext } from '../../../context';
import { ValidationGuard } from '../../../guards/validation.guard';
import { UUID } from 'crypto';
import { BaseQueryFilterValidator } from '../../../decorators/base-query-filter-validator';
import { Cache } from '@apillon/modules-lib';

@Controller('admin-panel/users')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @BaseQueryFilterValidator()
  @Cache({ keyPrefix: CacheKeyPrefix.ADMIN_USER_LIST })
  async listUsers(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseQueryFilter,
  ) {
    return this.userService.getUserList(context, query);
  }

  @Get(':user_uuid')
  async getUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
  ) {
    return this.userService.getUser(context, user_uuid);
  }

  @Get(':user_uuid/projects')
  @BaseQueryFilterValidator()
  async getUserProjects(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Query() query: BaseQueryFilter,
  ) {
    return this.userService.getUserProjects(context, user_uuid, query);
  }

  @Get(':user_uuid/logins')
  @BaseQueryFilterValidator()
  async getUserLogins(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Query() query: BaseQueryFilter,
  ) {
    return this.userService.getUserLogins(context, user_uuid, query);
  }

  @Get(':user_uuid/roles')
  @BaseQueryFilterValidator()
  async getUserRoles(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Query() query: BaseQueryFilter,
  ) {
    return this.userService.getUserRoles(context, user_uuid, query);
  }

  @Post(':user_uuid/roles/:id')
  async addUserRole(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Param('id', ParseIntPipe) role_id: DefaultUserRole,
  ): Promise<QuotaDto[]> {
    return this.userService.addUserRole(context, { user_uuid, role_id });
  }

  @Delete(':user_uuid/roles/:id')
  async removeUserRole(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Param('id', ParseIntPipe) role_id: DefaultUserRole,
  ): Promise<QuotaDto[]> {
    return this.userService.removeUserRole(context, { user_uuid, role_id });
  }

  @Get(':user_uuid/quotas')
  @Validation({ dto: GetQuotasDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getUserQuotas(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Query() query: GetQuotasDto,
  ): Promise<QuotaDto[]> {
    query.object_uuid = user_uuid;
    query.types = [QuotaType.FOR_OBJECT];
    return this.userService.getUserQuotas(context, query);
  }

  @Post(':user_uuid/quotas')
  @Validation({
    dto: CreateQuotaOverrideDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async createUserQuota(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Body() data: CreateQuotaOverrideDto,
  ): Promise<QuotaDto[]> {
    data.object_uuid = user_uuid;
    return this.userService.createUserQuota(context, data);
  }

  @Delete(':user_uuid/quotas')
  @Validation({
    dto: QuotaOverrideDto,
    validateFor: ValidateFor.BODY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async deleteUserQuota(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Body() data: QuotaOverrideDto,
  ): Promise<QuotaDto[]> {
    data.object_uuid = user_uuid;
    return this.userService.deleteUserQuota(context, data);
  }

  @Post(':user_uuid/block')
  @HttpCode(200)
  async blockUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
  ) {
    return this.userService.blockUser(context, user_uuid);
  }

  @Post(':user_uuid/unblock')
  @HttpCode(200)
  async unblockUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
  ) {
    return this.userService.unblockUser(context, user_uuid);
  }
}
