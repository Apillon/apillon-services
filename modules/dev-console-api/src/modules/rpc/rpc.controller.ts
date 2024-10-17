import {
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  CreateRpcUrlDto,
  DefaultPermission,
  DefaultUserRole,
  ListRpcUrlsForApiKeyQueryFilter,
  RoleGroup,
  UpdateRpcApiKeyDto,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Validation, Permissions } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RpcService } from './rpc.service';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthGuard } from '../../guards/auth.guard';
import { ProjectAccessGuard } from '../../guards/project-access.guard';

@Controller('rpc')
@Permissions({ permission: DefaultPermission.RPC })
export class RpcController {
  constructor(private readonly rpcService: RpcService) {}

  @Post('/:project_uuid/user')
  @Permissions({ role: RoleGroup.ProjectOwnerAccess })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async createUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return await this.rpcService.createUser(context, project_uuid);
  }

  @Post('api-key')
  @Validation({ dto: CreateRpcApiKeyDto })
  @Permissions({ role: RoleGroup.ProjectOwnerAccess })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async createApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateRpcApiKeyDto,
  ) {
    return await this.rpcService.createRpcApiKey(context, body);
  }

  @Put('api-key/:id')
  @Validation({ dto: UpdateRpcApiKeyDto })
  @Permissions({ role: RoleGroup.ProjectOwnerAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateRpcApiKeyDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.updateRpcApiKey(context, id, body);
  }

  @Put('api-key/:id/revoke')
  @Permissions({ role: RoleGroup.ProjectOwnerAccess })
  @UseGuards(AuthGuard)
  async revokeApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.revokeRpcApiKey(context, id);
  }

  @Get('api-key')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: BaseProjectQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ProjectAccessGuard, AuthGuard, ValidationGuard)
  async listApiKeysForProject(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.rpcService.listRpcApiKeys(context, query);
  }

  @Get('api-key/:id')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.getApiKey(context, id);
  }

  @Get('api-key/:id/usage')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getApiKeyUsage(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.getApiKeyUsage(context, id);
  }

  @Get('api-key/:id/urls')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: ListRpcUrlsForApiKeyQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async getUrlsForApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ListRpcUrlsForApiKeyQueryFilter,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.listRpcUrlsForApiKey(context, query, id);
  }

  @Get('endpoints')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getEndpoints(@Ctx() context: DevConsoleApiContext) {
    return await this.rpcService.listEndpoints(context);
  }

  @Post('url')
  @Validation({ dto: CreateRpcUrlDto })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  async createUrl(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateRpcUrlDto,
  ) {
    return await this.rpcService.createRpcUrl(context, body);
  }

  @Delete('url/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteUrl(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.deleteRpcUrl(context, id);
  }
}
