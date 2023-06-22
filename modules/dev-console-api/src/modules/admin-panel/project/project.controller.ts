import { DefaultUserRole } from '@apillon/lib';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Ctx, Permissions } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { ProjectService } from './project.service';
import { DevConsoleApiContext } from '../../../context';

@Controller('admin-panel/projects')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async listProjects() {
    return []; // TODO
  }

  @Get(':project_uuid')
  async getProject(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return this.projectService.getProject(context, project_uuid);
  }

  @Get(':project_uuid/qoutas')
  async getProjectQuotas(
    @Ctx() context: DevConsoleApiContext,
    @Param('project_uuid') project_uuid: string,
  ) {
    return []; // TODO
  }
}
