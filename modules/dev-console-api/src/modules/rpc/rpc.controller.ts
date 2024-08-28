import {
  BaseProjectQueryFilter,
  CreateRpcEnvironmentDto,
  CreateRpcUrlDto,
  UpdateRpcEnvironmentDto,
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
  @Post('environment')
  @Validation({ dto: CreateRpcEnvironmentDto })
  @UseGuards(ValidationGuard, ProjectAccessGuard, AuthGuard)
  async createEnvironment(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateRpcEnvironmentDto,
  ) {
    return await this.rpcService.createRpcEnvironment(context, body);
  }
  @Put('environment/:id')
  @Validation({ dto: UpdateRpcEnvironmentDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateEnvironment(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateRpcEnvironmentDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.updateRpcEnvironment(context, id, body);
  }
  @Put('environment/:id/revoke')
  @UseGuards(AuthGuard)
  async revokeEnvironment(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.revokeRpcEnvironment(context, id);
  }
  @Get('environment')
  @UseGuards(ProjectAccessGuard, AuthGuard)
  async listEnvironmentsForProject(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.rpcService.listRpcEnvironments(context, query);
  }
  @Get('environment/:id/usage')
  @UseGuards(AuthGuard)
  async getEnvironmentUsage(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.getEnvironmentUsage(context, id);
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
  @Validation({ dto: UpdateRpcEnvironmentDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateUrl(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateRpcEnvironmentDto,
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
