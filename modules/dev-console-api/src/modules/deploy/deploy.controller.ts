import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DeployService } from './deploy.service';
import {
  CreateDeploymentConfigDto,
  DefaultUserRole,
  GitHubWebhookPayload,
} from '@apillon/lib';
import { GithubWebhookGuard } from '../../guards/github-webhook.guard';
import { Ctx, Validation, Permissions } from '@apillon/modules-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('deploy')
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

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
}
