import { DefaultUserRole } from '@apillon/lib';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Ctx, Permissions } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { ProjectService } from './project.service';
import { DevConsoleApiContext } from '../../../context';

@Controller('admin-panel')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('projects')
  async listProjects() {
    return []; // TODO
  }

  @Get('projects/:project_uuid')
  async getProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return this.projectService.getProject(context, project_uuid);
  }

  @Get('projects/:project_uuid/qoutas')
  async getProjectQuotas(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return []; // TODO
  }
}
