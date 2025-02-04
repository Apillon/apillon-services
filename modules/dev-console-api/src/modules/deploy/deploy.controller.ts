import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Req,
  Param,
  Query,
} from '@nestjs/common';
import { DeployService } from './deploy.service';
import {
  CreateDeploymentConfigDto,
  DefaultUserRole,
  DeploymentBuildQueryFilter,
  GitHubWebhookPayload,
  GithubLinkDto,
  ValidateFor,
} from '@apillon/lib';
import { GithubWebhookGuard } from '../../guards/github-webhook.guard';
import { Ctx, Validation, Permissions } from '@apillon/modules-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { ProjectAccessGuard } from '../../guards/project-access.guard';
import { GithubUnlinkDto } from '@apillon/lib';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';

@Controller('deploy')
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

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

  @Post('gitub/list-repos/:project_uuid')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
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
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateDeploymentConfigDto })
  @UseGuards(ValidationGuard)
  async createDeploymentConfig(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateDeploymentConfigDto,
  ) {
    return await this.deployService.createDeploymentConfig(context, body);
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
}
