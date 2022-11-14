import {
  ApiKeyQueryFilter,
  ApiKeyRoleDto,
  CreateApiKeyDto,
  DefaultUserRole,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyRoleBaseDto } from '@apillon/lib/dist/lib/at-services/ams/dtos/api-key-role-base.dto';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ApiKeyService } from './api-key.service';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post('api-key-role')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: ApiKeyRoleDto })
  @UseGuards(ValidationGuard)
  async assignRoleToApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ApiKeyRoleDto,
  ) {
    return await this.apiKeyService.assignRoleToApiKey(context, body);
  }

  @Delete('api-key-role')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: ApiKeyRoleDto })
  @UseGuards(ValidationGuard)
  async removeApiKeyRole(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ApiKeyRoleDto,
  ) {
    return await this.apiKeyService.removeApiKeyRole(context, body);
  }

  @Get()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: ApiKeyQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getApiKeyList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ApiKeyQueryFilter,
  ) {
    return await this.apiKeyService.getApiKeyList(context, query);
  }

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateApiKeyDto })
  @UseGuards(ValidationGuard)
  async createApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateApiKeyDto,
  ) {
    return await this.apiKeyService.createApiKey(context, body);
  }

  @Delete(':id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.apiKeyService.deleteApiKey(context, id);
  }
}
