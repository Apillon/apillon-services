import {
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  CreateRpcUrlDto,
  DefaultPermission,
  DefaultUserRole,
  RoleGroup,
  UpdateRpcApiKeyDto,
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
  @UseGuards(ProjectAccessGuard, AuthGuard)
  async listApiKeysForProject(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.rpcService.listRpcApiKeys(context, query);
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

  @Put('url/:id')
  @Validation({ dto: UpdateRpcApiKeyDto })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateUrl(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateRpcApiKeyDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.updateRpcUrl(context, id, body);
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
