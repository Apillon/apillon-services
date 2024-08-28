import {
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  CreateRpcUrlDto,
  UpdateRpcApiKeyDto,
} from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
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
export class RpcController {
  constructor(private readonly rpcService: RpcService) {}
  @Post('api-key')
  @Validation({ dto: CreateRpcApiKeyDto })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async createApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateRpcApiKeyDto,
  ) {
    return await this.rpcService.createRpcApiKey(context, body);
  }
  @Put('api-key/:id')
  @Validation({ dto: UpdateRpcApiKeyDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateRpcApiKeyDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.updateRpcApiKey(context, id, body);
  }
  @Put('api-key/:id/revoke')
  @UseGuards(AuthGuard)
  async revokeApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.revokeRpcApiKey(context, id);
  }
  @Get('api-key')
  @UseGuards(ProjectAccessGuard, AuthGuard)
  async listApiKeysForProject(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.rpcService.listRpcApiKeys(context, query);
  }
  @Get('api-key/:id/usage')
  @UseGuards(AuthGuard)
  async getApiKeyUsage(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.getApiKeyUsage(context, id);
  }
  @Post('url')
  @Validation({ dto: CreateRpcUrlDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createUrl(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateRpcUrlDto,
  ) {
    return await this.rpcService.createRpcUrl(context, body);
  }
  @Put('url/:id')
  @Validation({ dto: UpdateRpcApiKeyDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateUrl(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateRpcApiKeyDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.updateRpcUrl(context, id, body);
  }
  @Delete('url/:id')
  @UseGuards(AuthGuard)
  async deleteUrl(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.deleteRpcUrl(context, id);
  }
}
