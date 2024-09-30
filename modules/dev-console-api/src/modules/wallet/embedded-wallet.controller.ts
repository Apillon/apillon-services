import {
  BaseProjectQueryFilter,
  CreateEWIntegrationDto,
  DefaultPermission,
  DefaultUserRole,
  EmbeddedWalletSignaturesQueryFilter,
  RoleGroup,
  UpdateEWIntegrationDto,
  ValidateFor,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { EmbeddedWalletService } from './embedded-wallet.service';
import { ProjectAccessGuard } from '../../guards/project-access.guard';

@Controller('embedded-wallet')
@Permissions({ permission: DefaultPermission.WALLET })
export class EmbeddedWalletController {
  constructor(private readonly service: EmbeddedWalletService) {}

  @Get('info')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ProjectAccessGuard, ValidationGuard, AuthGuard)
  async getEmbeddedWalletInfo(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.service.getEmbeddedWalletInfo(context, query);
  }

  @Get('integrations')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getIntegrationsList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.service.getIntegrationsList(context, query);
  }

  @Get('integrations/:integration_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getIntegration(
    @Ctx() context: DevConsoleApiContext,
    @Param('integration_uuid', ParseUUIDPipe) integration_uuid: string,
  ) {
    return await this.service.getIntegration(context, integration_uuid);
  }

  @Post('integration')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: CreateEWIntegrationDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createIntegration(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateEWIntegrationDto,
  ) {
    return await this.service.createIntegration(context, body);
  }

  @Patch('integrations/:integration_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: UpdateEWIntegrationDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async updateIntegration(
    @Ctx() context: DevConsoleApiContext,
    @Param('integration_uuid', ParseUUIDPipe) integration_uuid: string,
    @Body() body: UpdateEWIntegrationDto,
  ) {
    return await this.service.updateIntegration(
      context,
      integration_uuid,
      body,
    );
  }

  @Get('integrations/:integration_uuid/signatures')
  @Validation({
    dto: EmbeddedWalletSignaturesQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  async listSignatures(
    @Ctx() context: DevConsoleApiContext,
    @Param('integration_uuid') integration_uuid: string,
    @Query() query: EmbeddedWalletSignaturesQueryFilter,
  ) {
    query.integration_uuid = integration_uuid;
    return await this.service.listSignatures(context, query);
  }
}
