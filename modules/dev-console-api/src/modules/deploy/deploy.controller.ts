import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Req,
  Param,
  Query,
  Delete,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { DeployService } from './deploy.service';
import {
  CreateDeploymentConfigDto,
  DefaultUserRole,
  DeploymentBuildQueryFilter,
  GithubLinkDto,
  SetEnvironmentVariablesDto,
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
import { GitHubWebhookPayload } from '../../config/types';
import { DeployNftWebsiteDto } from './dtos/deploy-nft-website.dto';
import { UpdateDeploymentConfigDto } from '@apillon/lib';

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
}
