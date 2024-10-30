import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RpcService } from './rpc.service';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  ApillonApiCreateRpcApiKeyDto,
  AttachedServiceType,
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  DefaultApiKeyRole,
  ValidateFor,
} from '@apillon/lib';
import { AuthGuard } from '../../guards/auth.guard';
import { ApillonApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { DevConsoleApiContext } from '@apillon/dev-console-api/src/context';

@Controller('rpc')
export class RpcController {
  constructor(private readonly rpcService: RpcService) {}

  @Post('api-key')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.RPC,
  })
  @Validation({ dto: ApillonApiCreateRpcApiKeyDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async createApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ApillonApiCreateRpcApiKeyDto,
  ) {
    return await this.rpcService.createApiKey(context, body);
  }

  @UseGuards(AuthGuard)
  @Get('api-key')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.RPC,
  })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listApiKeys(
    @Ctx() context: ApillonApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.rpcService.listApiKeys(context, query);
  }

  @Get('api-key/:id')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.RPC,
  })
  @UseGuards(AuthGuard)
  async getApiKey(
    @Ctx() context: ApillonApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.rpcService.getApiKey(context, id);
  }

  @Get('endpoints')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.RPC,
  })
  @UseGuards(AuthGuard)
  async getEndpoints(@Ctx() context: ApillonApiContext) {
    return await this.rpcService.getEndpoints(context);
  }
}
