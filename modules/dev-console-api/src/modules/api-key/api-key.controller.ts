import {
  ApiKeyQueryFilterDto,
  ApiKeyRoleBaseDto,
  ApiKeyRoleDto,
  CreateApiKeyDto,
  DefaultUserRole,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
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
import { ProjectModifyGuard } from '../../guards/project-modify.guard';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post(':id/role')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: ApiKeyRoleBaseDto })
  @UseGuards(ValidationGuard, ProjectModifyGuard)
  async assignRoleToApiKey(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApiKeyRoleBaseDto,
  ) {
    return await this.apiKeyService.assignRoleToApiKey(
      context,
      new ApiKeyRoleDto({ ...body, apiKey_id: id }, context),
    );
  }

  @Delete(':id/role')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: ApiKeyRoleBaseDto })
  @UseGuards(ValidationGuard)
  async removeApiKeyRole(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApiKeyRoleBaseDto,
  ) {
    return await this.apiKeyService.removeApiKeyRole(
      context,
      new ApiKeyRoleDto({ ...body, apiKey_id: id }, context),
    );
  }

  @Delete(':id/service-roles')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: ApiKeyRoleBaseDto })
  @UseGuards(ValidationGuard)
  async removeApiKeyRolesByService(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApiKeyRoleBaseDto,
  ) {
    return await this.apiKeyService.removeApiKeyRolesByService(
      context,
      new ApiKeyRoleDto({ ...body, apiKey_id: id }, context),
    );
  }

  @Get(':id/roles')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getApiKeyRoles(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.apiKeyService.getApiKeyRoles(context, id);
  }

  @Get()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @Validation({ dto: ApiKeyQueryFilterDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getApiKeyList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: ApiKeyQueryFilterDto,
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
  @UseGuards(ValidationGuard, ProjectModifyGuard)
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
