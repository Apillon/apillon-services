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
  Patch,
} from '@nestjs/common';
import { DeployService } from './deploy.service';
import {
  BackendsQueryFilter,
  CreateDeploymentConfigDto,
  DefaultUserRole,
  DeploymentBuildQueryFilter,
  GenericHostingRequestDto,
  GithubLinkDto,
  GithubUnlinkDto,
  ResizeInstanceDto,
  RoleGroup,
  SetEnvironmentVariablesDto,
  ValidateFor,
} from '@apillon/lib';
import { GithubWebhookGuard } from '../../guards/github-webhook.guard';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ProjectAccessGuard } from '../../guards/project-access.guard';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';
import { GitHubWebhookPayload } from '../../config/types';
import { DeployNftWebsiteDto } from './dtos/deploy-nft-website.dto';
import { UpdateDeploymentConfigDto } from '@apillon/lib';
import { BackendsService } from './backends.service';

const ROUTE_BACKENDS = '/backends';

@Controller('deploy')
export class DeployController {
  constructor(
    private readonly deployService: DeployService,
    private readonly backendsService: BackendsService,
  ) {}

  @Get('project-config/:project_uuid')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async getProjectConfig(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') projectUuid: string,
  ) {
    return this.deployService.getProjectConfig(context, projectUuid);
  }

  @Post('github/link')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ProjectModifyGuard, ValidationGuard)
  @Validation({ dto: GithubLinkDto })
  async linkGithub(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: GithubLinkDto,
  ) {
    return this.deployService.linkGithub(context, body);
  }

  @Post('github/unlink')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard, ProjectModifyGuard, ValidationGuard)
  @Validation({ dto: GithubUnlinkDto })
  async unlinkGithub(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: GithubUnlinkDto,
  ) {
    return this.deployService.unlinkGithub(context, body);
  }

  @Get('github/list-repos/:project_uuid')
  @Permissions({ role: DefaultUserRole.USER }, { role: DefaultUserRole.ADMIN })
  @UseGuards(AuthGuard, ProjectAccessGuard)
  async listRepos(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') projectUuid: string,
  ) {
    return this.deployService.listRepos(context, projectUuid);
  }

  @Post('webhook')
  @UseGuards(GithubWebhookGuard)
  async handleGithubWebhook(
    @Body() body: GitHubWebhookPayload,
    @Ctx() context: DevConsoleApiContext,
  ) {
    return await this.deployService.handleGithubWebhook(context, body);
  }

  @Post('config')
  @Permissions(
    { role: DefaultUserRole.ADMIN },
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateDeploymentConfigDto })
  @UseGuards(ValidationGuard, ProjectModifyGuard)
  async createDeploymentConfig(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateDeploymentConfigDto,
  ) {
    return await this.deployService.createDeploymentConfig(context, body);
  }

  @Patch('config/:id')
  @Permissions(
    { role: DefaultUserRole.ADMIN },
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard, ValidationGuard)
  @Validation({ dto: UpdateDeploymentConfigDto })
  async updateDeploymentConfig(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDeploymentConfigDto,
  ) {
    return await this.deployService.updateDeploymentConfig(context, id, body);
  }

  @Delete('config/:website_uuid')
  @Permissions(
    { role: DefaultUserRole.ADMIN },
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async deleteDeploymentConfig(
    @Ctx() context: DevConsoleApiContext,
    @Param('website_uuid') websiteUuid: string,
  ) {
    return await this.deployService.deleteDeploymentConfig(
      context,
      websiteUuid,
    );
  }

  @Get('config/variables/:deploymentConfigId')
  @Permissions(
    { role: DefaultUserRole.ADMIN },
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.USER },
  )
  @UseGuards(AuthGuard)
  async getEnvironmentVariables(
    @Ctx() context: DevConsoleApiContext,
    @Param('deploymentConfigId', ParseIntPipe) deploymentConfigId: number,
  ) {
    return await this.deployService.getEnvironmentVariables(
      context,
      deploymentConfigId,
    );
  }

  @Post('config/variables')
  @Permissions(
    { role: DefaultUserRole.ADMIN },
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @Validation({ dto: SetEnvironmentVariablesDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async setEnvironmentVariables(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: SetEnvironmentVariablesDto,
  ) {
    return await this.deployService.setEnvironmentVariables(context, body);
  }

  @Get('deploy-build')
  @Validation({
    dto: DeploymentBuildQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async getDeploymentBuilds(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: DeploymentBuildQueryFilter,
  ) {
    return await this.deployService.listDeploymentBuilds(context, query);
  }

  @Post('nft')
  @Validation({
    dto: DeployNftWebsiteDto,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async deployNftWebsite(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: DeployNftWebsiteDto,
  ) {
    return await this.deployService.deployNftWebsite(context, body);
  }

  //region BACKENDS
  @Get(ROUTE_BACKENDS)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BackendsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listBackends(
    @Ctx()
    context: DevConsoleApiContext,
    @Body()
    body: BackendsQueryFilter,
  ) {
    return await this.backendsService.listBackends(context, body);
  }

  @Get(`${ROUTE_BACKENDS}/:uuid`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getInstance(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.getInstance(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Get(`${ROUTE_BACKENDS}/:uuid/details`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getInstanceDetails(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.getInstanceDetails(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Get(`${ROUTE_BACKENDS}/:uuid/state`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getInstanceStats(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.getInstanceState(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Get(`${ROUTE_BACKENDS}/:uuid/attestation`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getInstanceAttestation(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.getInstanceAttestation(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  // @Get(`${ROUTE_BACKENDS}/:uuid/billing`)
  // @Permissions({ role: RoleGroup.ProjectAccess })
  // @UseGuards(AuthGuard)
  // async getInstanceBilling(
  //   @Ctx()
  //   context: DevConsoleApiContext,
  //   @Param('uuid') hosting_uuid: string,
  // ) {
  //   return await this.backendsService.getInstanceBilling(
  //     context,
  //     new GenericHostingRequestDto().populate({ hosting_uuid }),
  //   );
  // }

  @Post(`${ROUTE_BACKENDS}/:uuid/start`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async startInstance(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.startInstance(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Post(`${ROUTE_BACKENDS}/:uuid/shutdown`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async shutdownInstance(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.shutdownInstance(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Post(`${ROUTE_BACKENDS}/:uuid/stop`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async stopInstance(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.stopInstance(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Post(`${ROUTE_BACKENDS}/:uuid/restart`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async restartInstance(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.restartInstance(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Delete(`${ROUTE_BACKENDS}/:uuid`)
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async destroyInstance(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
  ) {
    return await this.backendsService.destroyInstance(
      context,
      new GenericHostingRequestDto().populate({ hosting_uuid }),
    );
  }

  @Post(`${ROUTE_BACKENDS}/:uuid/resize`)
  @Validation({ dto: ResizeInstanceDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async resizeInstance(
    @Ctx()
    context: DevConsoleApiContext,
    @Param('uuid') hosting_uuid: string,
    @Body()
    body: ResizeInstanceDto,
  ) {
    body.hosting_uuid = hosting_uuid;
    return await this.backendsService.resizeInstance(context, body);
  }

  //endregion
}
